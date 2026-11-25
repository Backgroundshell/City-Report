"""Saved report priorities and administrator-approved AI proposals."""

import hashlib
import json
import secrets
import time

VALUES = ("critical", "high", "medium", "low")
PROPOSAL_TTL = 30 * 60


class PriorityError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def migrate(connection):
    columns = {row[1] for row in connection.execute("PRAGMA table_info(reports)")}
    additions = {
        "priority": "TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('critical','high','medium','low'))",
        "priority_source": "TEXT NOT NULL DEFAULT 'default' CHECK(priority_source IN ('default','manual','ai'))",
        "priority_reason": "TEXT",
        "priority_version": "INTEGER NOT NULL DEFAULT 0",
    }
    for name, definition in additions.items():
        if name not in columns:
            connection.execute(f"ALTER TABLE reports ADD COLUMN {name} {definition}")
    connection.execute("""CREATE TABLE IF NOT EXISTS priority_proposals(
        token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),
        payload TEXT NOT NULL,expires_at INTEGER NOT NULL,applied_at TEXT)""")


def audit(connection, report_id, priority, user, source, timestamp):
    connection.execute(
        "INSERT INTO audit_log(event_type,entity,entity_id,details,created_at) VALUES(?,?,?,?,?)",
        ("UPDATE", "report", report_id,
         f"Priorytet zgłoszenia #{report_id}: {priority} ({source}, {user['name']})", timestamp),
    )


def set_priority(connection, report_id, value, user, timestamp):
    if type(report_id) is not int or not 1 <= report_id <= 2**63 - 1:
        raise PriorityError("Nieprawidłowy numer zgłoszenia.")
    if not isinstance(value, str) or value not in VALUES:
        raise PriorityError("Wybierz priorytet: krytyczny, wysoki, średni lub niski.")
    cursor = connection.execute("""UPDATE reports SET priority=?,priority_source='manual',
        priority_reason=NULL,priority_version=priority_version+1,updated_at=? WHERE id=?""",
        (value, timestamp, report_id))
    if not cursor.rowcount:
        raise PriorityError("Nie znaleziono zgłoszenia.", 404)
    audit(connection, report_id, value, user, "ręcznie", timestamp)
    return {"ok": True, "id": report_id, "priority": value}


def create_proposal(connection, user, analysis, snapshot):
    if not analysis["reports"]:
        return None
    originals = {report["id"]: report for report in snapshot["reports"]}
    payload = []
    for result in analysis["reports"]:
        original = originals[result["id"]]
        payload.append({"id": result["id"], "priority": result["priority"], "reason": result["reason"],
                        "version": original.get("priority_version", 0),
                        "status": original.get("status"), "updated_at": original.get("updated_at")})
    token = secrets.token_urlsafe(32)
    connection.execute("DELETE FROM priority_proposals WHERE expires_at<?", (int(time.time()),))
    connection.execute("INSERT INTO priority_proposals(token_hash,user_id,payload,expires_at) VALUES(?,?,?,?)",
                       (hashlib.sha256(token.encode()).hexdigest(), user["id"], json.dumps(payload),
                        int(time.time()) + PROPOSAL_TTL))
    return token


def apply_proposal(connection, token, user, timestamp):
    if not isinstance(token, str) or not 1 <= len(token) <= 200:
        raise PriorityError("Wygeneruj analizę AI przed zapisaniem priorytetów.")
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    proposal = connection.execute("SELECT * FROM priority_proposals WHERE token_hash=? AND user_id=?",
                                  (token_hash, user["id"])).fetchone()
    if proposal is None or proposal["expires_at"] < int(time.time()):
        raise PriorityError("Analiza wygasła lub jest niedostępna. Wygeneruj nową propozycję AI.", 409)
    payload = json.loads(proposal["payload"])
    if proposal["applied_at"]:
        return {"ok": True, "applied_count": len(payload), "already_applied": True}
    # Reserve the proposal in this transaction before validating the report versions.
    # A failure below rolls back both this claim and every priority/audit update.
    claimed = connection.execute("UPDATE priority_proposals SET applied_at=? WHERE token_hash=? AND applied_at IS NULL",
                                  (timestamp, token_hash))
    if not claimed.rowcount:
        return {"ok": True, "applied_count": len(payload), "already_applied": True}
    for item in payload:
        cursor = connection.execute("""UPDATE reports SET priority=?,priority_source='ai',priority_reason=?,
            priority_version=priority_version+1,updated_at=?
            WHERE id=? AND priority_version=? AND status=? AND updated_at=?""",
            (item["priority"], item["reason"], timestamp, item["id"], item["version"], item["status"], item["updated_at"]))
        if not cursor.rowcount:
            raise PriorityError("Zgłoszenia zmieniły się od analizy. Wygeneruj nowe propozycje; nic nie zapisano.", 409)
        audit(connection, item["id"], item["priority"], user, "AI", timestamp)
    return {"ok": True, "applied_count": len(payload), "already_applied": False}
