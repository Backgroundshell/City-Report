
# CityReport

**Language / Język:** [English](README.md) | [Polski](README.pl.md)

CityReport to platforma internetowa do zgłaszania problemów w przestrzeni miejskiej: dziur, niedziałających latarni, uszkodzonych chodników, przepełnionych koszy i innych usterek.

## Uruchomienie

```bash
python app.py
```

Otwórz [http://127.0.0.1:8000](http://127.0.0.1:8000/).

## Lokalizacja zgłoszenia

W formularzu wpisz ulicę i miejscowość, kliknij **Szukaj** i wybierz adres, jeśli pojawi się kilka wyników. Możesz też kliknąć mapę lub wybrać **Użyj mojej lokalizacji (GPS)**. GPS wymaga zgody przeglądarki oraz HTTPS lub localhost. Wskazany punkt można zapisać także wtedy, gdy w pobliżu nie ma adresu. Przycisk **Otwórz lokalizację na mapie** w szczegółach zgłoszenia otwiera interaktywną mapę wewnątrz CityReport. Zamknij ją przyciskiem lub klawiszem Esc, aby wrócić do szczegółów.

Po wskazaniu punktu formularz wyświetla pobliski adres w polu adresu i przy pinezce. Zgłoszenie zachowuje dokładne położenie wybranego punktu.

W panelu administratora mapa obejmuje zgłoszenia wszystkich mieszkańców. Kliknij pinezkę, aby otworzyć szczegóły zgłoszenia. Liczba na pinezce oznacza kilka zgłoszeń w tym samym miejscu. Zgłoszenia bez zapisanego położenia są dostępne na liście pod mapą.

Mapa pobiera kafelki OpenStreetMap. Backend wysyła wyszukiwany adres lub wybrany punkt do usługi Photon. Własną instancję można wskazać zmienną `CITYREPORT_PHOTON_URL`.

## Usuwanie zgłoszeń w środowisku deweloperskim

W terminalu w katalogu projektu wybierz jedno z poniższych poleceń.

| **Cel** | **Polecenie** |
| --- | --- |
| Usuń zgłoszenie nr 7 | `python dev.py delete-report 7` |
| Wyczyść całą listę „Wszystkie zgłoszenia” | `python dev.py delete-all-reports` |

Zastąp `7` numerem widocznym w panelu obsługi. Polecenie usuwa wybrane zgłoszenia wraz ze zdjęciami i zapisuje operację w dzienniku. Konta i kategorie pozostają dostępne. Odśwież panel, aby zobaczyć wynik.

## Usuwanie wpisów z dziennika operacji

| **Cel** | **Polecenie** |
| --- | --- |
| Usuń wpis nr 12 | `python dev.py delete-log-entry 12` |
| Wyczyść cały „Dziennik operacji” | `python dev.py clear-log` |

Zastąp `12` numerem widocznym przy treści wpisu w sekcji „Dziennik operacji”. Oba polecenia trwale usuwają wybrane wpisy. Odśwież panel, aby zobaczyć wynik.

## Logowanie

Po otwarciu aplikacji pojawi się ekran logowania. Konta demonstracyjne:

| **Rola** | **E-mail** | **Hasło** |
| --- | --- | --- |
| Mieszkaniec | [jan@cityreport.local](mailto:jan@cityreport.local) | CityReport123! |
| Administrator | [anna@cityreport.local](mailto:anna@cityreport.local) | CityReportAdmin123! |

Możesz uzupełnić formularz przyciskiem w sekcji „Konta demonstracyjne”. Mieszkaniec widzi własne zgłoszenia; administrator ma dostęp do panelu obsługi i asystenta AI. Przycisk „Wyloguj się” kończy sesję. Sesja wygasa po 12 godzinach.

Hasła są przechowywane jako skróty PBKDF2, a sesje korzystają z ciasteczek HttpOnly. Przy pierwszym uruchomieniu tej wersji hasła zostaną dodane do istniejących kont demonstracyjnych bez usuwania zgłoszeń. Przed tym uruchomieniem można ustawić własne hasła przez `CITYREPORT_RESIDENT_PASSWORD` i `CITYREPORT_ADMIN_PASSWORD`; późniejsze zmiany tych zmiennych nie nadpisują zapisanych haseł. Podpowiedzi kont na ekranie logowania dotyczą domyślnych haseł demonstracyjnych.

## Lokalny LLM

AI korzysta z kompatybilnego z OpenAI API serwera. Domyślnie jest to lokalny serwer LM Studio. Przykład konfiguracji dla Ollama:

```powershell
$env:LOCAL_LLM_BASE_URL = "http://127.0.0.1:11434/v1"
$env:LOCAL_LLM_MODEL = "llama3.2-vision"
python app.py
```

Adapter używa `/v1/chat/completions` i obsługuje czat administratora oraz opis zdjęcia. Domyślnie aplikacja łączy się z LM Studio pod `http://127.0.0.1:1234/v1`. Do zdjęć używa modelu `qwen2.5-vl-7b-instruct`, a do czatu oddzielnego modelu `openai/gpt-oss-20b`. Wybierz identyfikatory modeli dostępne na swoim serwerze. Aplikacja przekazuje model przy każdym żądaniu i pozostawia jego ładowanie oraz przełączanie LM Studio. Włączone w LM Studio opcje [JIT loading i Auto-Evict](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict) pozwalają przełączać modele automatycznie; aplikacja czeka na odpowiedź do 180 sekund.

Model i serwer czatu można ustawić niezależnie od analizy zdjęć:

```powershell
$env:LOCAL_CHAT_LLM_MODEL = "openai/gpt-oss-20b"
$env:LOCAL_CHAT_LLM_BASE_URL = "http://127.0.0.1:1234/v1"
python app.py
```

`LOCAL_LLM_MODEL` i `LOCAL_LLM_BASE_URL` dotyczą analizy zdjęć. Jeśli nie podasz `LOCAL_CHAT_LLM_BASE_URL`, czat użyje tego samego serwera co zdjęcia, ale swojego modelu. Przy konfiguracji Ollama ustaw także `LOCAL_CHAT_LLM_MODEL` na identyfikator modelu tekstowego dostępnego w Ollama. Po zmianie zmiennych uruchom aplikację ponownie. Nazwa aktywnego modelu pojawia się przy odpowiedziach asystenta.

Jeśli serwer LM Studio wymaga autoryzacji, ustaw `LOCAL_LLM_API_KEY` przed uruchomieniem aplikacji. Klucz jest wysyłany wyłącznie przez backend w nagłówku `Authorization` i nie trafia do przeglądarki.

## Czat administratora

Po zalogowaniu jako administrator otwórz **Asystent AI**. Czat jest ukryty dla mieszkańców, a backend odrzuca ich żądania do `/api/ai/chat` kodem 403 (bez sesji: 401).

Przy każdym pytaniu backend pobiera wszystkie aktualne zgłoszenia z SQLite i przekazuje modelowi ich numery, tytuły, opisy, adresy, współrzędne, kategorie, statusy i daty. Zdjęcia, hasła i dane sesji nie są częścią kontekstu czatu. Model korzysta z ostatnich sześciu wymian rozmowy, a nowe dane zastępują informacje o wcześniejszych statusach.

Możesz użyć gotowych pytań lub wpisać np. „Czego dotyczą nowe zgłoszenia?”, „Co opisano w zgłoszeniu #1?” albo „Które problemy warto obsłużyć najpierw?”. Priorytety są sugestiami; czat nie zmienia zgłoszeń. Przycisk **Nowa rozmowa** czyści historię w przeglądarce. Historia znika też po odświeżeniu strony. Niedostępność lokalnego modelu jest widoczna w rozmowie i pozwala ponowić pytanie.

Cały zestaw opisów musi mieścić się w kontekście wybranego modelu; aplikacja nie pomija zgłoszeń po cichu. Uruchom serwer LLM i udostępnij modele przez ręczne wczytanie lub JIT loading przed użyciem czatu. Dane czatu są wysyłane do serwera wskazanego przez `LOCAL_CHAT_LLM_BASE_URL` (domyślnie `LOCAL_LLM_BASE_URL`), domyślnie lokalnego.

Przycisk **Zaproponuj priorytety** używa tego samego endpointu `/api/ai/chat` z polem `mode: "prioritize"`. Backend przekazuje wyłącznie aktualne nierozwiązane zgłoszenia i stosuje [JSON Schema w `response_format`](https://lmstudio.ai/docs/developer/openai-compat/structured-output). Model zwraca `summary` oraz tablicę `reports` z polami `id`, `priority` (`critical`, `high`, `medium`, `low`) i krótkim polskim `reason`. Backend sprawdza strukturę, długości tekstów, dozwolone priorytety i dokładnie jeden wynik dla każdego przekazanego numeru. Niepełna analiza, duplikaty i wymyślone numery są odrzucane w całości (HTTP 502).

Wyniki są uzupełniane tytułem, kategorią, adresem i statusem z migawki bazy, sortowane od krytycznego do niskiego i wyświetlane jako karty z kolorowymi oznaczeniami. Brakujące dane mają czytelne opisy zastępcze. Teksty AI są wstawiane przez `textContent`. Analiza nie zmienia zgłoszeń ani schematu bazy; priorytety pozostają sugestiami administratora. Pusta lista jest obsługiwana bez wywoływania modelu.

Prośby wpisane w rozmowie, np. „Pokaż podobne zgłoszenia i dodaj im priorytety” lub „give me only simular reports and add priorityes for them”, automatycznie uruchamiają tryb `similar` w tym samym endpointcie. Prośby o nadanie priorytetów uruchamiają tryb `prioritize` także bez klikania gotowego pytania. Wyjaśnienia pojęć i zwykłe pytania nadal korzystają ze swobodnej rozmowy. Frontend dobiera karty według trybu zwróconego przez backend.

W trybie podobieństwa model wybiera wyłącznie powiązane nierozwiązane zgłoszenia na podstawie treści opisów. Sama kategoria nie wystarcza. Opisy bez co najmniej dwóch słów liczących po trzy litery są pomijane jako niewystarczające do potwierdzenia podobieństwa. Każdy wynik zawiera własny priorytet, wzajemne odwołania `similar_to` do innych zwróconych wyników i `evidence` — dosłowny fragment opisu sprawdzany przez backend. Karty pokazują numery powiązanych zgłoszeń i ten fragment. Brak potwierdzonych podobieństw daje pustą listę z wyjaśnieniem, bez dopisywania znaczenia do testowych opisów. Jest to semantyczna sugestia modelu; sprawdzenie fragmentów potwierdza ich pochodzenie, ale nie zastępuje oceny administratora.

Zwykłe pytania i pozostałe gotowe pytania nadal korzystają z odpowiedzi tekstowych, bez wymuszania JSON Schema. Jeśli preset LM Studio opakowuje tekst w JSON, backend odczytuje odpowiedź tekstową z tego opakowania. Podstawowy Markdown w zwykłych odpowiedziach (tabele, pogrubienia, kursywa, nagłówki, listy, cytaty, kod i linki) jest wyświetlany przez lokalny renderer DOM bez dodatkowych zależności. Szerokie tabele i kod można przewijać poziomo. Surowy HTML pozostaje tekstem, obrazy nie są ładowane, a linki dopuszczają tylko HTTP, HTTPS i pocztę. Wiadomości użytkownika pozostają zwykłym tekstem. Dane analizy pozostają w historii jako czytelny tekst, więc można o nie dopytać. Błędy połączenia, ładowania modelu i autoryzacji LM Studio zwracają polskie komunikaty (HTTP 503) bez treści błędów serwera i kluczy. Wygaśnięcie sesji aplikacji (HTTP 401) kieruje do logowania.

Testy uprawnień, aktualności kontekstu i błędów czatu (bez uruchamiania modelu):

```bash
python -m unittest discover -s tests -v
```

Sprawdzenie w przeglądarce:

1. Uruchom LM Studio z pobranymi modelami oraz `python app.py`. Zaloguj się jako administrator i otwórz **Asystent AI**.
2. Kliknij **Zaproponuj priorytety**. Każde nierozwiązane zgłoszenie powinno otrzymać własny priorytet i uzasadnienie; rozwiązane zgłoszenia nie powinny pojawić się w kartach. Sprawdź kolejność i polskie znaki.
3. Wpisz zwykłe pytanie, np. „Co opisano w zgłoszeniu #1?”, i dopytaj o poprzednią analizę. Odpowiedzi powinny pozostać tekstem.
4. Sprawdź szerokość mobilną (np. 390 px): karty powinny mieścić się w oknie, a rozmowa przewijać wewnątrz panelu.
5. W formularzu zgłoszenia dodaj zdjęcie i kliknij **Zaproponuj opis ze zdjęcia**. Opis nadal powinien pochodzić z modelu wizyjnego Qwen, a kolejne pytanie w czacie z modelu GPT-OSS.
6. Przy zatrzymanym serwerze LM Studio sprawdź czytelny błąd i możliwość ponowienia analizy. Testy automatyczne obejmują również błędny JSON, brakujące wyniki, nieznane numery, wszystkie priorytety, pustą listę i błędy autoryzacji.
7. Wpisz „give me only simular reports and add priorityes for them”. Wynik powinien zawierać wyłącznie potwierdzone pary lub grupy, priorytet każdego wyniku, powiązane numery i fragmenty opisów. Gdy brakuje danych lub podobieństw, powinien pojawić się komunikat zamiast przypadkowych grup kategorii.

Po aktualizacji backendu uruchom ponownie `python app.py` i odśwież stronę. Zasoby czatu mają wersjonowane adresy, a serwer wymaga ponownej walidacji pamięci podręcznej, aby przeglądarka pobierała aktualny renderer.

## Scenariusz prezentacji

1. W strefie mieszkańca kliknij „Zgłoś problem”.
2. Dodaj zdjęcie. Opis możesz wpisać samodzielnie albo zostawić pusty.
3. Backend wyśle zdjęcie do lokalnego modelu wizyjnego i zwróci sugestię opisu. Mieszkaniec może ją zaakceptować, zmienić lub wpisać własny tekst przed wysłaniem.
4. W strefie mieszkańca sprawdź listę własnych zgłoszeń i ich statusy.
5. W panelu administratora zmień status zgłoszenia i pokaż zapis w `audit_log`.
6. Otwórz Asystenta AI i zapytaj o priorytety zgłoszeń.

## Zgodność z raportem

Zaimplementowano oddzielone strefy mieszkańca (przycisk dodania problemu i statusy własnych zgłoszeń) oraz administratora (wszystkie zgłoszenia, statusy, kategorie, mapa, audyt). Lokalny AI działa po stronie backendu: analizuje zdjęcie i przygotowuje edytowalną sugestię, a także obsługuje chat administratora. System udostępnia REST API i relacyjną bazę SQLite.
