import gc
import http.client
import io
import json
from contextlib import closing, redirect_stdout
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch

import app
import city
import dev


class CityCommunicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.previous_db = app.DB_PATH
        app.DB_PATH = Path(cls.temp.name) / "city-tests.db"
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

    def login(self, admin=False):
        status, headers, _ = self.request("POST", "/api/login", {
            "email": "anna@cityreport.local" if admin else "jan@cityreport.local",
            "password": "CityReportAdmin123!" if admin else "CityReport123!",
        })
        self.assertEqual(status, 200)
        return headers["Set-Cookie"].split(";", 1)[0]

    def setUp(self):
        with closing(app.db()) as connection, connection:
            connection.execute("DELETE FROM reports")
            connection.execute("DELETE FROM audit_log")
        self.admin = self.login(admin=True)
        self.resident = self.login()
        status, _, report = self.request("POST", "/api/reports", {
            "title": "Uszkodzony chodnik", "description": "Pęknięte płyty.",
            "address": "Rynek Główny, Kraków", "category_id": 1,
            "latitude": 50.0617, "longitude": 19.9379,
        }, self.resident)
        self.assertEqual(status, 200)
        self.report_id = report["id"]
        self.payload = {"report_id": self.report_id, "department": "roads",
                        "subject": "Naprawa chodnika", "body": "Proszę o zaplanowanie naprawy."}

    def create_case(self):
        status, _, result = self.request("POST", "/api/city/cases", self.payload, self.admin)
        self.assertEqual(status, 201, result)
        return result

    def test_admin_only_access(self):
        for method, path in (("GET", "/api/city/cases"), ("GET", "/api/city/cases/1"),
                             ("POST", "/api/city/cases"), ("POST", "/api/city/cases/1/messages"),
                             ("POST", "/api/city/cases/1/settings")):
            with self.subTest(method=method, path=path), patch.object(city, "list_cases") as listing:
                self.assertEqual(self.request(method, path, {})[0], 401)
                self.assertEqual(self.request(method, path, {}, self.resident)[0], 403)
                listing.assert_not_called()

    def test_case_and_correspondence_persist_without_external_delivery(self):
        with patch.object(app.urllib.request, "urlopen") as external:
            case = self.create_case()
            path = "/api/city/cases/" + str(case["id"])
            self.assertEqual(case["report_id"], self.report_id)
            self.assertEqual(case["status"], "open")
            self.assertEqual(case["messages"][0]["direction"], "outgoing")
            for direction, body in (("incoming", "Naprawa zaplanowana na jutro."),
                                    ("outgoing", "Proszę zabezpieczyć miejsce do czasu naprawy.")):
                status, _, case = self.request("POST", path + "/messages", {
                    "direction": direction, "body": body, "author_id": 2,
                }, self.admin)
                self.assertEqual(status, 201)
                self.assertEqual(case["messages"][-1]["body"], body)
                self.assertEqual(case["messages"][-1]["author_name"], "Anna Kowalska")
            self.assertEqual(len(case["messages"]), 3)
            listing = self.request("GET", "/api/city/cases", cookie=self.admin)[2]
            self.assertTrue(listing["demo"])
            self.assertEqual(len(listing["departments"]), 4)
            self.assertEqual(listing["cases"][0]["message_count"], 3)
            app.init_db()
            self.assertEqual(self.request("GET", path, cookie=self.admin)[2], case)
            external.assert_not_called()
        with closing(app.db()) as connection:
            entities = [row[0] for row in connection.execute("SELECT entity FROM audit_log WHERE entity LIKE 'city_%'")]
        self.assertEqual(entities.count("city_case"), 1)
        self.assertEqual(entities.count("city_message"), 2)

    def test_invalid_requests_duplicates_and_missing_records(self):
        for change in ({"report_id": True}, {"report_id": "1"}, {"report_id": 0},
                       {"report_id": 2**63}, {"department": []}, {"department": "unknown"},
                       {"subject": " "}, {"subject": "x" * 161}, {"body": []},
                       {"body": " "}, {"body": "x" * 4001}):
            with self.subTest(change=change):
                self.assertEqual(self.request("POST", "/api/city/cases", {**self.payload, **change}, self.admin)[0], 400)
        self.assertEqual(self.request("GET", "/api/city/cases", cookie=self.admin)[2]["cases"], [])
        self.assertEqual(self.request("POST", "/api/city/cases", {**self.payload, "report_id": 999999}, self.admin)[0], 404)
        case = self.create_case()
        self.assertEqual(self.request("POST", "/api/city/cases", self.payload, self.admin)[0], 409)
        path = "/api/city/cases/" + str(case["id"])
        for message in ({"direction": "fake", "body": "Test"}, {"direction": [], "body": "Test"},
                        {"direction": "incoming", "body": " "}, {"direction": "outgoing", "body": "x" * 4001}):
            self.assertEqual(self.request("POST", path + "/messages", message, self.admin)[0], 400)
        self.assertEqual(self.request("POST", path + "/settings", {"department": "roads", "status": "fake"}, self.admin)[0], 400)
        self.assertEqual(self.request("GET", path, cookie=self.admin)[2], case)
        for missing in ("/api/city/cases/999999", "/api/city/cases/0"):
            self.assertIn(self.request("GET", missing, cookie=self.admin)[0], (400, 404))
        self.assertEqual(self.request("GET", "/api/city/cases/9223372036854775808", cookie=self.admin)[0], 400)
        self.assertEqual(self.request("POST", "/api/city/cases/999999/messages", {"direction": "incoming", "body": "Test"}, self.admin)[0], 404)
        self.assertEqual(self.request("POST", "/api/city/cases/999999/settings", {"department": "roads", "status": "open"}, self.admin)[0], 404)

    def test_repair_status_sync_and_department_history(self):
        case = self.create_case()
        path = "/api/city/cases/" + str(case["id"])
        self.assertEqual(self.request("POST", path + "/messages", {"direction": "incoming", "body": "Przekazujemy sprawę oświetleniu."}, self.admin)[0], 201)
        status, _, case = self.request("POST", path + "/settings", {"department": "lighting", "status": "in_progress"}, self.admin)
        self.assertEqual(status, 200)
        self.assertEqual(case["report_status"], "W toku")
        self.assertEqual(case["messages"][-1]["department"], "roads")
        report_path = "/api/reports/" + str(self.report_id)
        self.assertEqual(self.request("GET", report_path, cookie=self.resident)[2]["status"], "W toku")
        self.assertEqual(self.request("POST", report_path + "/status", {"status": "Rozwiązane"}, self.admin)[0], 200)
        self.assertEqual(self.request("GET", path, cookie=self.admin)[2]["status"], "resolved")
        self.assertEqual(self.request("POST", path + "/settings", {"department": "lighting", "status": "open"}, self.admin)[0], 200)
        self.assertEqual(self.request("GET", report_path, cookie=self.resident)[2]["status"], "Nowe")

    def test_report_deletion_cascades_to_correspondence(self):
        case = self.create_case()
        with redirect_stdout(io.StringIO()):
            self.assertEqual(dev.main(["delete-report", str(self.report_id)]), 0)
        self.assertEqual(self.request("GET", "/api/city/cases", cookie=self.admin)[2]["cases"], [])
        self.assertEqual(self.request("GET", "/api/city/cases/" + str(case["id"]), cookie=self.admin)[0], 404)
        with closing(app.db()) as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM city_messages").fetchone()[0], 0)
            self.assertEqual(list(connection.execute("PRAGMA foreign_key_check")), [])

    def test_failed_first_message_rolls_back_case_and_audit(self):
        with closing(app.db()) as connection, connection:
            connection.execute("CREATE TRIGGER fail_city_message BEFORE INSERT ON city_messages BEGIN SELECT RAISE(ABORT,'test failure'); END")
        try:
            self.assertEqual(self.request("POST", "/api/city/cases", self.payload, self.admin)[0], 400)
            self.assertEqual(self.request("GET", "/api/city/cases", cookie=self.admin)[2]["cases"], [])
            with closing(app.db()) as connection:
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM audit_log WHERE entity='city_case'").fetchone()[0], 0)
        finally:
            with closing(app.db()) as connection, connection:
                connection.execute("DROP TRIGGER fail_city_message")


if __name__ == "__main__":
    unittest.main()
