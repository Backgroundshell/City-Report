import gc
import http.client
import json
from contextlib import closing
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

import app


class ReportPriorityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.previous_db = app.DB_PATH
        app.DB_PATH = Path(cls.temp.name) / "priorities.db"
        app.init_db()
        cls.server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        app.DB_PATH = cls.previous_db
        gc.collect()
        cls.temp.cleanup()

    def request(self, method, path, data=None, cookie=None):
        headers = {"Content-Type": "application/json"}
        if cookie:
            headers["Cookie"] = cookie
        connection = http.client.HTTPConnection(*self.server.server_address, timeout=5)
        connection.request(method, path, json.dumps(data) if data is not None else None, headers)
        response = connection.getresponse()
        body = response.read()
        result = response.status, dict(response.getheaders()), json.loads(body)
        connection.close()
        return result

    def login(self, admin=False, email=None, password=None):
        status, headers, _ = self.request("POST", "/api/login", {
            "email": email or ("anna@cityreport.local" if admin else "jan@cityreport.local"),
            "password": password or ("CityReportAdmin123!" if admin else "CityReport123!"),
        })
        self.assertEqual(status, 200)
        return headers["Set-Cookie"].split(";", 1)[0]

    def setUp(self):
        with closing(app.db()) as connection, connection:
            connection.execute("DELETE FROM reports")
            connection.execute("DELETE FROM priority_proposals")
            connection.execute("DELETE FROM audit_log")
        self.admin = self.login(admin=True)
        self.resident = self.login()
        self.ids = []
        for title in ("Niebezpieczna dziura w jezdni", "Uszkodzona ławka"):
            status, _, result = self.request("POST", "/api/reports", {
                "title": title, "description": "Usterka w pobliżu przejścia dla pieszych.",
                "address": "Rynek Główny, Kraków", "category_id": 1,
                "priority": "critical", "priority_source": "ai",
            }, self.resident)
            self.assertEqual(status, 200)
            self.ids.append(result["id"])

    def snapshot(self):
        return app.rows("SELECT * FROM reports ORDER BY id")

    def proposal(self, ids=None, message=None):
        selected = ids or self.ids
        answer = {"summary": "Ocena pilności napraw.", "reports": [
            {"id": report_id, "priority": "critical" if index == 0 else "high", "reason": "Usterka wymaga naprawy."}
            for index, report_id in enumerate(selected)]}
        data = {"message": message or "Zaproponuj priorytety", "mode": "chat" if message else "prioritize"}
        if ids is not None and not message:
            data["report_ids"] = ids
        with patch.object(app, "local_llm", return_value=json.dumps(answer)):
            status, _, result = self.request("POST", "/api/ai/chat", data, self.admin)
        self.assertEqual(status, 200, result)
        self.assertIsInstance(result["proposal_token"], str)
        return result["proposal_token"]

    def apply(self, token, cookie=None):
        return self.request("POST", "/api/ai/priorities/apply", {"proposal_token": token}, cookie or self.admin)

    def test_default_and_manual_priorities_are_persistent_and_admin_only(self):
        path = f"/api/reports/{self.ids[0]}/priority"
        self.assertTrue(all(report["priority"] == "medium" and report["priority_source"] == "default" for report in self.snapshot()))
        self.assertEqual(self.request("POST", path, {"priority": "high"})[0], 401)
        self.assertEqual(self.request("POST", path, {"priority": "high"}, self.resident)[0], 403)
        self.assertEqual(self.request("POST", "/api/ai/priorities/apply", {"proposal_token": "fake"})[0], 401)
        self.assertEqual(self.apply("fake", self.resident)[0], 403)
        for version, value in enumerate(app.PRIORITIES, 1):
            status, _, _ = self.request("POST", path, {"priority": value, "priority_source": "ai"}, self.admin)
            self.assertEqual(status, 200)
            admin_report = self.request("GET", f"/api/reports/{self.ids[0]}", cookie=self.admin)[2]
            resident_report = self.request("GET", f"/api/reports/{self.ids[0]}", cookie=self.resident)[2]
            self.assertEqual(admin_report["priority"], value)
            self.assertEqual(admin_report["priority_source"], "manual")
            self.assertEqual(admin_report["priority_version"], version)
            self.assertIsNone(admin_report["priority_reason"])
            self.assertEqual(resident_report["priority"], value)
            self.assertNotIn("priority_reason", resident_report)
        before = self.snapshot()
        app.init_db()
        self.assertEqual(self.snapshot(), before)
        events = app.rows("SELECT * FROM audit_log WHERE event_type='UPDATE'")
        self.assertEqual(len(events), 4)

    def test_invalid_or_forged_updates_leave_reports_unchanged(self):
        before = self.snapshot()
        for value in (None, [], {}, 0, "urgent", "HIGH", ""):
            self.assertEqual(self.request("POST", f"/api/reports/{self.ids[0]}/priority", {"priority": value}, self.admin)[0], 400)
        self.assertEqual(self.request("POST", "/api/reports/999999/priority", {"priority": "high"}, self.admin)[0], 404)
        self.assertEqual(self.request("POST", "/api/reports/9223372036854775808/priority", {"priority": "high"}, self.admin)[0], 400)
        self.assertEqual(self.apply("not-a-generated-proposal")[0], 409)
        self.assertEqual(self.request("POST", "/api/ai/priorities/apply", {"reports": [{"id": self.ids[0], "priority": "critical"}]}, self.admin)[0], 400)
        self.assertEqual(self.snapshot(), before)

    def test_ai_preview_apply_and_retry_do_not_overwrite_later_manual_edits(self):
        before = self.snapshot()
        token = self.proposal()
        self.assertEqual(self.snapshot(), before)
        status, _, result = self.apply(token)
        self.assertEqual(status, 200)
        self.assertEqual(result["applied_count"], 2)
        reports = self.snapshot()
        self.assertEqual([report["priority"] for report in reports], ["critical", "high"])
        self.assertTrue(all(report["priority_source"] == "ai" and report["priority_reason"] for report in reports))
        self.assertEqual([report["status"] for report in reports], [report["status"] for report in before])
        self.request("POST", f"/api/reports/{self.ids[0]}/priority", {"priority": "low"}, self.admin)
        manual = self.snapshot()
        status, _, result = self.apply(token)
        self.assertEqual(status, 200)
        self.assertTrue(result["already_applied"])
        self.assertEqual(self.snapshot(), manual)

    def test_stale_proposals_roll_back_the_entire_batch(self):
        for change in ("priority", "status", "delete"):
            with self.subTest(change=change):
                token = self.proposal()
                report_id = self.ids[1]
                if change == "priority":
                    self.request("POST", f"/api/reports/{report_id}/priority", {"priority": "low"}, self.admin)
                elif change == "status":
                    self.request("POST", f"/api/reports/{report_id}/status", {"status": "W toku"}, self.admin)
                else:
                    with closing(app.db()) as connection, connection:
                        connection.execute("DELETE FROM reports WHERE id=?", (report_id,))
                before = self.snapshot()
                audits = app.rows("SELECT * FROM audit_log ORDER BY id")
                self.assertEqual(self.apply(token)[0], 409)
                self.assertEqual(self.snapshot(), before)
                self.assertEqual(app.rows("SELECT * FROM audit_log ORDER BY id"), audits)
                self.assertTrue(all(row["applied_at"] is None for row in app.rows("SELECT applied_at FROM priority_proposals")))

    def test_proposals_are_private_to_the_generating_administrator(self):
        token = self.proposal()
        with closing(app.db()) as connection, connection:
            connection.execute("INSERT OR IGNORE INTO users(name,email,role,password_hash) VALUES(?,?,?,?)",
                               ("Second Admin", "second@cityreport.local", "Administrator", app.hash_password("SecondAdmin123!")))
        other = self.login(email="second@cityreport.local", password="SecondAdmin123!")
        self.assertEqual(self.apply(token, other)[0], 409)
        self.assertEqual(self.apply(token)[0], 200)

    def test_expired_empty_and_invalid_ai_results_never_change_priorities(self):
        token = self.proposal()
        with closing(app.db()) as connection, connection:
            connection.execute("UPDATE priority_proposals SET expires_at=?", (int(time.time()) - 1,))
        before = self.snapshot()
        self.assertEqual(self.apply(token)[0], 409)
        with patch.object(app, "local_llm", return_value='{"summary":"Incomplete","reports":[]}'):
            self.assertEqual(self.request("POST", "/api/ai/chat", {"message": "Priorytety", "mode": "prioritize"}, self.admin)[0], 502)
        self.assertEqual(self.snapshot(), before)
        with closing(app.db()) as connection, connection:
            connection.execute("UPDATE reports SET status='Rozwiązane'")
        with patch.object(app, "local_llm") as model:
            status, _, result = self.request("POST", "/api/ai/chat", {"message": "Priorytety", "mode": "prioritize"}, self.admin)
            self.assertEqual(status, 200)
            self.assertIsNone(result["proposal_token"])
            model.assert_not_called()

    def test_targeted_ai_commands_and_explicit_selection(self):
        other = self.request("GET", f"/api/reports/{self.ids[1]}", cookie=self.admin)[2]
        token = self.proposal([self.ids[0]], message=f"Set priority for report #{self.ids[0]}")
        self.assertEqual(self.apply(token)[0], 200)
        self.assertEqual(self.request("GET", f"/api/reports/{self.ids[1]}", cookie=self.admin)[2], other)
        self.request("POST", f"/api/reports/{self.ids[0]}/status", {"status": "Rozwiązane"}, self.admin)
        token = self.proposal([self.ids[0]])
        self.assertEqual(self.apply(token)[0], 200)
        self.assertEqual(app.report_request_mode(f"What priority does report #{self.ids[0]} have?", []), "chat")

    def test_invalid_report_selections_are_rejected_before_calling_ai(self):
        for selected in ([], [True], [0], [999999], [self.ids[0], self.ids[0]], "all"):
            with self.subTest(selected=selected), patch.object(app, "local_llm") as model:
                status, _, _ = self.request("POST", "/api/ai/chat", {
                    "message": "Zaproponuj priorytety", "mode": "prioritize", "report_ids": selected,
                }, self.admin)
                self.assertEqual(status, 400)
                model.assert_not_called()

    def test_legacy_migration_preserves_reports_and_credentials(self):
        path = Path(self.temp.name) / "legacy.db"
        with patch.object(app, "DB_PATH", path):
            app.init_db()
            with closing(app.db()) as connection, connection:
                before = [tuple(row) for row in connection.execute("SELECT id,title,description,photo_data FROM reports ORDER BY id")]
                users = [tuple(row) for row in connection.execute("SELECT id,password_hash FROM users ORDER BY id")]
                for column in ("priority", "priority_source", "priority_reason", "priority_version"):
                    connection.execute(f"ALTER TABLE reports DROP COLUMN {column}")
            app.init_db()
            with closing(app.db()) as connection:
                self.assertEqual(before, [tuple(row) for row in connection.execute("SELECT id,title,description,photo_data FROM reports ORDER BY id")])
                self.assertEqual(users, [tuple(row) for row in connection.execute("SELECT id,password_hash FROM users ORDER BY id")])
                self.assertEqual([row[0] for row in connection.execute("SELECT DISTINCT priority FROM reports")], ["medium"])


if __name__ == "__main__":
    unittest.main()
