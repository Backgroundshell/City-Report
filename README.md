# CityReport

CityReport to platforma internetowa do zgłaszania problemów w przestrzeni miejskiej: dziur, niedziałających latarni, uszkodzonych chodników, przepełnionych koszy i innych usterek.

## Uruchomienie

```powershell
python app.py
```

Otwórz http://127.0.0.1:8000.

## Logowanie

Po otwarciu aplikacji pojawi się ekran logowania. Konta demonstracyjne:

| Rola | E-mail | Hasło |
| --- | --- | --- |
| Mieszkaniec | jan@cityreport.local | CityReport123! |
| Administrator | anna@cityreport.local | CityReportAdmin123! |

Możesz uzupełnić formularz przyciskiem w sekcji „Konta demonstracyjne”. Mieszkaniec widzi własne zgłoszenia; administrator ma dostęp do panelu obsługi i asystenta AI. Przycisk „Wyloguj się” kończy sesję. Sesja wygasa po 12 godzinach.

Hasła są przechowywane jako skróty PBKDF2, a sesje korzystają z ciasteczek HttpOnly. Przy pierwszym uruchomieniu tej wersji hasła zostaną dodane do istniejących kont demonstracyjnych bez usuwania zgłoszeń. Przed tym uruchomieniem można ustawić własne hasła przez `CITYREPORT_RESIDENT_PASSWORD` i `CITYREPORT_ADMIN_PASSWORD`; późniejsze zmiany tych zmiennych nie nadpisują zapisanych haseł. Podpowiedzi kont na ekranie logowania dotyczą domyślnych haseł demonstracyjnych.

## Lokalny LLM

AI korzysta z kompatybilnego z OpenAI API serwera. Domyślnie jest to lokalny serwer LM Studio. Przykład konfiguracji dla Ollama:

```powershell
$env:LOCAL_LLM_BASE_URL = "http://127.0.0.1:11434/v1"
$env:LOCAL_LLM_MODEL = "llama3.2-vision"
python app.py
```

Adapter używa `/v1/chat/completions` i obsługuje czat administratora oraz opis zdjęcia. Domyślnie aplikacja łączy się z LM Studio pod `http://127.0.0.1:1234/v1` i używa modelu `qwen2.5-vl-7b-instruct@q8_0`. Powyższy przykład przełącza ją na Ollama. Wybierz nazwę modelu dostępną na swoim serwerze.

## Czat administratora

Po zalogowaniu jako administrator otwórz **Asystent AI**. Czat jest ukryty dla mieszkańców, a backend odrzuca ich żądania do `/api/ai/chat` kodem 403 (bez sesji: 401).

Przy każdym pytaniu backend pobiera wszystkie aktualne zgłoszenia z SQLite i przekazuje modelowi ich numery, tytuły, opisy, adresy, współrzędne, kategorie, statusy i daty. Zdjęcia, hasła i dane sesji nie są częścią kontekstu czatu. Model korzysta z ostatnich sześciu wymian rozmowy, a nowe dane zastępują informacje o wcześniejszych statusach.

Możesz użyć gotowych pytań lub wpisać np. „Czego dotyczą nowe zgłoszenia?”, „Co opisano w zgłoszeniu #1?” albo „Które problemy warto obsłużyć najpierw?”. Priorytety są sugestiami; czat nie zmienia zgłoszeń. Przycisk **Nowa rozmowa** czyści historię w przeglądarce. Historia znika też po odświeżeniu strony. Niedostępność lokalnego modelu jest widoczna w rozmowie i pozwala ponowić pytanie.

Cały zestaw opisów musi mieścić się w kontekście wybranego modelu; aplikacja nie pomija zgłoszeń po cichu. Uruchom serwer LLM i wczytaj model przed użyciem czatu. Dane są wysyłane do serwera wskazanego przez `LOCAL_LLM_BASE_URL`, domyślnie lokalnego.

Testy uprawnień, aktualności kontekstu i błędów czatu (bez uruchamiania modelu):

```powershell
python -m unittest discover -s tests -v
```

## Scenariusz prezentacji

1. W strefie mieszkańca kliknij „Zgłoś problem”.
2. Dodaj zdjęcie. Opis możesz wpisać samodzielnie albo zostawić pusty.
3. Backend wyśle zdjęcie do lokalnego modelu wizyjnego i zwróci sugestię opisu. Mieszkaniec może ją zaakceptować, zmienić lub wpisać własny tekst przed wysłaniem.
4. W strefie mieszkańca sprawdź listę własnych zgłoszeń i ich statusy.
5. W panelu administratora zmień status zgłoszenia i pokaż zapis w `audit_log`.
6. Otwórz Asystenta AI i zapytaj o priorytety zgłoszeń.

## Zgodność z raportem

Zaimplementowano oddzielone strefy mieszkańca (przycisk dodania problemu i statusy własnych zgłoszeń) oraz administratora (wszystkie zgłoszenia, statusy, kategorie, mapa, audyt). Lokalny AI działa po stronie backendu: analizuje zdjęcie i przygotowuje edytowalną sugestię, a także obsługuje chat administratora. System udostępnia REST API i relacyjną bazę SQLite.
