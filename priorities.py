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


def apply_proposal(connection, token, user, timestamp, report_ids=None):
    if not isinstance(token, str) or not 1 <= len(token) <= 200:
        raise PriorityError("Wygeneruj analizę AI przed zapisaniem priorytetów.")
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    # Lock before reading progress so simultaneous subset approvals cannot replay
    # a report or replace one another's approval records.
    connection.execute("UPDATE priority_proposals SET payload=payload WHERE token_hash=? AND user_id=?",
                       (token_hash, user["id"]))
    proposal = connection.execute("SELECT * FROM priority_proposals WHERE token_hash=? AND user_id=?",
                                  (token_hash, user["id"])).fetchone()
    if proposal is None or proposal["expires_at"] < int(time.time()):
        raise PriorityError("Analiza wygasła lub jest niedostępna. Wygeneruj nową propozycję AI.", 409)
    payload = json.loads(proposal["payload"])
    available = {item["id"] for item in payload}
    if report_ids is not None and (
            not isinstance(report_ids, list) or not report_ids
            or any(type(value) is not int or not 1 <= value <= 2**63 - 1 for value in report_ids)
            or len(report_ids) != len(set(report_ids)) or set(report_ids) - available):
        raise PriorityError("Wybierz co najmniej jedno zgłoszenie z tej analizy, bez powtórzeń.")
    selected = available if report_ids is None else set(report_ids)
    # Older proposals used one applied_at flag for the entire batch.
    approved = available if proposal["applied_at"] else {item["id"] for item in payload if item.get("applied_at")}
    selected_pending = selected - approved
    pending = [item for item in payload if item["id"] in selected_pending]
    for item in pending:
        cursor = connection.execute("""UPDATE reports SET priority=?,priority_source='ai',priority_reason=?,
            priority_version=priority_version+1,updated_at=?
            WHERE id=? AND priority_version=? AND status=? AND updated_at=?""",
            (item["priority"], item["reason"], timestamp, item["id"], item["version"], item["status"], item["updated_at"]))
        if not cursor.rowcount:
            raise PriorityError("Wybrane zgłoszenia zmieniły się od analizy. Wygeneruj nowe propozycje; nic nie zapisano.", 409)
        audit(connection, item["id"], item["priority"], user, "AI", timestamp)
        item["applied_at"] = timestamp
    approved = approved | {item["id"] for item in pending}
    if pending:
        connection.execute("UPDATE priority_proposals SET payload=?,applied_at=? WHERE token_hash=?",
                           (json.dumps(payload), timestamp if approved == available else None, token_hash))
    return {"ok": True, "applied_count": len(selected), "newly_applied_count": len(pending),
            "already_applied": not pending, "approved_ids": sorted(approved),
            "remaining_ids": sorted(available - approved)}
