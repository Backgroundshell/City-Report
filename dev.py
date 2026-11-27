"""Local development commands for CityReport."""

import argparse
import sqlite3
import sys
from contextlib import closing

import app
import chat_report_fixtures


def main(argv=None):
    parser = argparse.ArgumentParser(description="Polecenia deweloperskie CityReport")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("seed-chat-reports", help="Dodaj 150 fikcyjnych zgłoszeń do testowania asystenta AI")
    single = commands.add_parser("delete-report", help="Usuń jedno zgłoszenie wraz ze zdjęciem")
    single.add_argument("id", type=int, help="Numer zgłoszenia z panelu obsługi")
    commands.add_parser("delete-all-reports", help="Trwale usuń wszystkie zgłoszenia wraz ze zdjęciami")
    entry = commands.add_parser("delete-log-entry", help="Usuń jeden wpis z dziennika operacji")
    entry.add_argument("id", type=int, help="Numer wpisu z dziennika operacji")
    commands.add_parser("clear-log", help="Trwale usuń wszystkie wpisy z dziennika operacji")
    args = parser.parse_args(argv)
    if hasattr(args, "id") and not 1 <= args.id <= 2**63 - 1:
        parser.error("Podaj poprawny dodatni identyfikator.")
    if not app.DB_PATH.is_file():
        print("Brak bazy CityReport. Uruchom aplikację poleceniem python app.py.", file=sys.stderr)
        return 1

    try:
        with closing(app.db()) as connection, connection:
            if args.command == "seed-chat-reports":
                connection.execute("BEGIN IMMEDIATE")
                count = chat_report_fixtures.seed(connection, app.now())
                message = f"Dodano zgłoszenia testowe AI ({count})." if count else "Wszystkie 150 zgłoszeń testowych AI już istnieje."
                if count:
                    app.log_event(connection, "SYSTEM", "database", None, message)
            elif args.command == "delete-all-reports":
                count = connection.execute("DELETE FROM reports").rowcount
                message = f"Usunięto zgłoszenia ({count})." if count else "Lista zgłoszeń jest już pusta."
                if count:
                    app.log_event(connection, "DELETE", "report", None, message)
            elif args.command == "delete-report":
                if not connection.execute("DELETE FROM reports WHERE id=?", (args.id,)).rowcount:
                    print(f"Nie znaleziono zgłoszenia #{args.id}.", file=sys.stderr)
                    return 1
                message = f"Usunięto zgłoszenie #{args.id}."
                app.log_event(connection, "DELETE", "report", args.id, message)
            elif args.command == "delete-log-entry":
                if not connection.execute("DELETE FROM audit_log WHERE id=?", (args.id,)).rowcount:
                    print(f"Nie znaleziono wpisu #{args.id}.", file=sys.stderr)
                    return 1
                message = f"Usunięto wpis #{args.id} z dziennika operacji."
            elif args.command == "clear-log":
                count = connection.execute("DELETE FROM audit_log").rowcount
                message = f"Usunięto wpisy z dziennika operacji ({count})." if count else "Dziennik operacji jest już pusty."
    except (sqlite3.Error, ValueError) as error:
        print(f"Nie udało się wykonać polecenia ({error}).", file=sys.stderr)
        return 1
    print(message)
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    sys.exit(main())
