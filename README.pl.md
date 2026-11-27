
# CityReport

**Language / Język:** [English](README.md) | [Polski](README.pl.md)

CityReport to platforma internetowa do zgłaszania problemów w przestrzeni miejskiej: dziur, niedziałających latarni, uszkodzonych chodników, przepełnionych koszy i innych usterek.

## Uruchomienie

```bash
python app.py
```

Otwórz [http://127.0.0.1:8000](http://127.0.0.1:8000/).

Po aktualizacji backendu uruchom proces Pythona ponownie i odśwież przeglądarkę. Start aplikacji dodaje brakujące tabele i kolumny bez usuwania zgłoszeń oraz kont. W systemie Windows komunikaty startowe używają UTF-8, także przy przekierowaniu do pliku.

## Nawigacja na górze

Wszystkie niebieskie znaczki logo **CR** mają stały kwadratowy rozmiar 32 × 32 px, zaokrąglone narożniki i wyśrodkowane inicjały na stronie logowania oraz w górnym pasku nawigacji, także na wąskich ekranach.

Nawigacja pozostaje u góry podczas przewijania strony. Na komputerze dostępne sekcje, profil konta i przycisk **Wyloguj się** znajdują się w jednym wierszu. Mieszkaniec może otworzyć własne zgłoszenia lub zgłosić problem, a administrator przełączać się między panelem obsługi, korespondencją miejską i asystentem AI.

Przy szerokości do 1050 px przycisk **Menu** pokazuje lub ukrywa sekcje oraz opcje konta. Obsługuje klawisze Enter i Spacja; Escape zamyka menu i przywraca fokus na przycisku. Wybranie sekcji lub otwarcie formularza zgłoszenia również zamyka menu. Logo i przycisk Menu pozostają widoczne nad treścią strony.

## Układ responsywny

Strony mieszkańca i administratora wypełniają dostępną szerokość pod górnym paskiem nawigacji, także na monitorach ultraszerokich. Układy dla tabletów i telefonów mają mniejsze odstępy od krawędzi strony i ustawiają panele pionowo. Mapy automatycznie dopasowują rozmiar do okna bez zmiany poziomu przybliżenia.

Aby sprawdzić układ, zmień szerokość okna przeglądarki na 390, 950, 1440, 2560 i 3840 px. Sprawdź strony mieszkańca i administratora, korespondencję miejską, asystenta AI oraz szczegóły zgłoszenia: treść powinna sięgać do odstępów po obu stronach, a szerokie tabele przewijać się wewnątrz swoich paneli. Na mniejszych ekranach sprawdź menu myszą i klawiaturą, w tym zamykanie po wybraniu sekcji. Przewiń stronę i upewnij się, że pasek pozostaje widoczny bez zasłaniania nagłówka strony.

## Kategorie

Panel administratora **Kategorie** służy tylko do odczytu: pokazuje nazwy kategorii i liczbę zgłoszeń, bez kontrolek edycji kategorii. Domyślne nazwy i kolory są zdefiniowane w `DEFAULT_CATEGORIES` w pliku `app.py`. Przy każdym uruchomieniu brakujące nazwy są dodawane zarówno do nowej, jak i istniejącej bazy, z zachowaniem identyfikatorów i kolorów istniejących kategorii, własnych kategorii oraz przypisania zgłoszeń. Po dodaniu kategorii domyślnej uruchom backend ponownie i odśwież stronę. Edycja lub usunięcie definicji nie zmienia nazwy ani koloru istniejącej kategorii i jej nie usuwa.

Dotychczasowa kategoria **Droga i chodnik** jest migrowana do osobnych kategorii **Droga** i **Chodnik**. Zgłoszenia, których tytuły jednoznacznie wskazują chodnik lub trotuar, trafiają do kategorii **Chodnik**; opis jest sprawdzany, gdy tytuł nie wskazuje ani drogi, ani chodnika. Zgłoszenia wspominające oba rodzaje miejsc lub żaden z nich pozostają w kategorii **Droga**. Dotychczasowe przypisania do osobnych kategorii pozostają bez zmian. Identyfikatory i pozostałe dane zgłoszeń są zachowane.

| Kategoria | Przykłady |
| --- | --- |
| Droga | Dziury w jezdni, uszkodzona nawierzchnia drogowa |
| Chodnik | Nierówne płyty, uszkodzona nawierzchnia chodnika |
| Oświetlenie | Niedziałające latarnie |
| Czystość | Śmieci, przepełnione kosze, dzikie wysypiska |
| Zieleń | Uszkodzone drzewa, zaniedbane tereny zielone |
| Oznakowanie i sygnalizacja | Uszkodzone znaki, niesprawne światła drogowe |
| Parkowanie | Zastawione chodniki, uszkodzona infrastruktura parkingowa |
| Transport publiczny | Uszkodzone przystanki, wiaty, tablice z rozkładem jazdy |
| Infrastruktura rowerowa | Uszkodzone drogi rowerowe i stojaki |
| Mała architektura | Zniszczone ławki, słupki, elementy wyposażenia przestrzeni publicznej |
| Place zabaw i rekreacja | Uszkodzone urządzenia na placach zabaw i siłowniach plenerowych |
| Inne | Problemy niepasujące do pozostałych kategorii |

Endpoint `POST /api/categories`, dostępny wyłącznie dla administratora, nadal przyjmuje `name` i opcjonalny `color`; jego uprawnienia i działanie pozostają bez zmian.

## Sortowanie zgłoszeń administratora

W **Panelu obsługi** wybierz **Sortuj według** nad tabelą **Wszystkie zgłoszenia**, aby uporządkować wpisy według daty (od najnowszych lub najstarszych), priorytetu (od najwyższego lub najniższego), statusu (od nowych do rozwiązanych lub odwrotnie), tytułu albo kategorii (A–Z lub Z–A, zgodnie z polskim alfabetem). Przy jednakowych wartościach zgłoszenia są porządkowane malejąco według numeru. Domyślnie najnowsze zgłoszenia są pierwsze.

Wybrana kolejność pozostaje aktywna przy przechodzeniu między widokami oraz zapisywaniu zmian statusu i priorytetu; zmienione zgłoszenia trafiają na odpowiednie miejsca. Odświeżenie strony przywraca kolejność od najnowszych.

## Lokalizacja zgłoszenia

Okno **Nowe zgłoszenie** ma szerokość do 800 px i dopasowuje się do mniejszych ekranów, zachowując odstęp od ich krawędzi.

W formularzu wpisz ulicę i miejscowość, kliknij **Szukaj** i wybierz adres, jeśli pojawi się kilka wyników. Możesz też kliknąć mapę lub wybrać **Użyj mojej lokalizacji (GPS)**. GPS wymaga zgody przeglądarki oraz HTTPS lub localhost. Wskazany punkt można zapisać także wtedy, gdy w pobliżu nie ma adresu. Przycisk **Otwórz lokalizację na mapie** w szczegółach zgłoszenia otwiera interaktywną mapę wewnątrz CityReport. Zamknij ją przyciskiem lub klawiszem Esc, aby wrócić do szczegółów.

Po wskazaniu punktu formularz wyświetla pobliski adres w polu adresu i przy pinezce. Zgłoszenie zachowuje dokładne położenie wybranego punktu.

W panelu administratora mapa obejmuje zgłoszenia wszystkich mieszkańców. Kliknij pinezkę, aby otworzyć szczegóły zgłoszenia. Liczba na pinezce oznacza kilka zgłoszeń w tym samym miejscu. Zgłoszenia bez zapisanego położenia są dostępne na liście pod mapą.

Mapa w panelu rośnie wraz z wysokością okna: zajmuje 65% wysokości obszaru przeglądarki na komputerze (420–900 px) i 60% na ekranach o szerokości do 650 px (360–520 px). Zmień wysokość okna, aby sprawdzić dopasowanie mapy; jej przyciski i znaczniki powinny działać po zmianie rozmiaru lub otwarciu menu nawigacji.

Mapa pobiera kafelki OpenStreetMap. Backend wysyła wyszukiwany adres lub wybrany punkt do usługi Photon. Własną instancję można wskazać zmienną `CITYREPORT_PHOTON_URL`.

## Zapisane priorytety zgłoszeń

Każde nowe i istniejące zgłoszenie ma zapisany priorytet: **Krytyczny**, **Wysoki**, **Średni** lub **Niski** (`critical`, `high`, `medium`, `low`). Domyślny priorytet to **Średni**. Priorytety są widoczne tylko dla administratora, który może je zmieniać w tabeli panelu obsługi lub w szczegółach zgłoszenia. Administrator widzi je też na kartach zgłoszeń, w dymkach mapy i w sprawach miejskich. Karty i szczegóły zgłoszeń mieszkańca pokazują status naprawy bez informacji o priorytecie; odpowiedzi API dla mieszkańca pomijają pola priorytetu.

W **Asystencie AI** wybierz **Zaproponuj priorytety** i sprawdź propozycje oraz uzasadnienia. Każda karta ma pole zatwierdzenia. Zostaw zaznaczone tylko zgłoszenia, z którymi się zgadzasz, i wybierz **Zapisz wybrane**. Możesz na przykład zatwierdzić zgłoszenia 1 i 3, pozostawiając zgłoszenie 2 bez zmian. **Zapisz wszystkie** zatwierdza wszystkie pozostałe propozycje niezależnie od zaznaczenia. Przy dłuższej analizie użyj przycisków zaznaczania i odznaczania wszystkich kart. Początkowo wszystkie propozycje są zaznaczone.

Analiza obejmuje domyślnie wszystkie nierozwiązane zgłoszenia. Aby ocenić jedną sprawę, wybierz **Zaproponuj priorytet przez AI** w jej szczegółach lub wpisz np. „Zaproponuj priorytet dla zgłoszenia #17”. Wskazane zgłoszenie może być również rozwiązane. Zwykłe pytanie „Jaki priorytet ma zgłoszenie #17?” odczytuje aktualny stan bez uruchamiania zapisu.

Sama analiza niczego nie zmienia. Każdy zapis zatwierdza w jednej transakcji tylko wybrane propozycje; odznaczone zgłoszenia nie są zmieniane ani sprawdzane w tym zapisie. Zapisane karty są oznaczane i blokowane. Pozostałe propozycje można zatwierdzić później, w ciągu pierwotnych 30 minut ważności analizy. Może to zrobić tylko administrator, który ją wygenerował. Zmiana wybranego zgłoszenia od czasu analizy odrzuca bieżący zapis w całości, bez częściowych aktualizacji; wcześniej zatwierdzone karty pozostają zapisane. Zmiany odznaczonych zgłoszeń nie blokują zatwierdzania innych. Powtórzenie zatwierdzonej propozycji nie nadpisuje późniejszych ręcznych zmian. Błędy modelu i niepełne wyniki nie zmieniają priorytetów.

Priorytety utrzymują się po odświeżeniu i restarcie aplikacji. W szczegółach administrator widzi źródło oraz uzasadnienie zapisu AI; zmiana ręczna zastępuje poprzednie uzasadnienie. Zmiany są zapisywane w dzienniku operacji. Zapis priorytetu nie zmienia statusu naprawy. Uruchom ponownie backend po aktualizacji, aby dodać nowe pola bez usuwania zgłoszeń i kont.

## Kontakt z miastem — lokalna demonstracja

Administrator ma dodatkową zakładkę **Kontakt z miastem**. Wybierz **Nowa sprawa**, wskaż zgłoszenie mieszkańca, właściwą służbę oraz pierwszą wiadomość. Tę samą sprawę można otworzyć przyciskiem **Kontakt ze służbami miejskimi** w szczegółach zgłoszenia. Każde zgłoszenie ma jedną sprawę; ponowne użycie przycisku otwiera jej historię.

W sprawie zapiszesz kolejne wiadomości i ręcznie dodasz **Odpowiedź służb (demo)**. Możesz zmienić służbę oraz etap: **Otwarta**, **W realizacji**, **Zakończona**. Etapy odpowiadają statusom zgłoszenia **Nowe**, **W toku**, **Rozwiązane** i są synchronizowane w obie strony. Lista obsługuje wyszukiwanie i filtrowanie, a korespondencja pozostaje dostępna po odświeżeniu strony.

To lokalny tryb demonstracyjny: wiadomości nie są wysyłane do urzędu, a odpowiedzi nie pochodzą z zewnętrznej usługi. Dostęp do widoku i endpointów `/api/city/` mają wyłącznie administratorzy. Historia, autorzy wpisów i zmiany etapów są zapisywane w bazie oraz dzienniku operacji. Usunięcie zgłoszenia usuwa też jego sprawę i wiadomości.

Po aktualizacji uruchom ponownie `python app.py` i odśwież stronę. Przy starcie aplikacja dodaje potrzebne tabele bez usuwania istniejących zgłoszeń i kont.

## Zgłoszenia testowe dla asystenta AI

Aby dodać powtarzalny zestaw 150 fikcyjnych zgłoszeń do istniejącej bazy:

```powershell
python dev.py seed-chat-reports
```

Zestaw obejmuje wszystkie 12 skonfigurowanych kategorii domyślnych: 70 zgłoszeń ma status Nowe, 40 W toku, a 40 Rozwiązane. Zawiera 30 grup po cztery powiązane zgłoszenia oraz 30 odrębnych problemów w tych samych kategoriach, aby analiza podobieństwa nie opierała się tylko na kategorii. Opisy dotyczą pilnych zagrożeń, zwykłych napraw i drobnych usterek estetycznych. Daty obejmują około trzech miesięcy; krakowskie adresy i punkty na mapie są ilustracyjne i nie opisują rzeczywistych zdarzeń. Zgłoszenia nie mają zdjęć i zaczynają z domyślnym priorytetem Średni, aby można było ocenić propozycje AI.

Tytuły mają znaczniki od **[TEST AI 001]** do **[TEST AI 150]**. Zgłoszenia należą do pierwszego istniejącego konta mieszkańca. Istniejące zgłoszenia, konta, kategorie i korespondencja miejska pozostają zachowane. Ponowne wykonanie polecenia dodaje tylko brakujące znaczniki i zachowuje zmiany istniejących wpisów testowych, w tym priorytety zapisane przez AI. Definicje zestawu znajdują się w pliku `chat_report_fixtures.py`; utworzenie wpisów jest odnotowywane w dzienniku operacji.

Odśwież aplikację i otwórz **Asystenta AI**. Wybierz **Zaproponuj priorytety** lub wpisz np. „Podsumuj zgłoszenia według kategorii i statusu”, „Które nierozwiązane zgłoszenia stwarzają zagrożenie dla dzieci?” albo „Pokaż podobne nierozwiązane zgłoszenia i zaproponuj priorytety”.

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

Przy każdym pytaniu backend pobiera aktualne zgłoszenia z SQLite i przekazuje modelowi ich numery, tytuły, opisy, adresy, współrzędne, kategorie, zapisane priorytety, statusy i daty. Zdjęcia, hasła i dane sesji nie są częścią kontekstu czatu. Model korzysta z ostatnich sześciu wymian rozmowy, a nowe dane zastępują informacje z wcześniejszych rozmów. Analiza priorytetu jednego zgłoszenia otrzymuje tylko wskazane zgłoszenie.

Możesz użyć gotowych pytań lub wpisać np. „Czego dotyczą nowe zgłoszenia?”, „Co opisano w zgłoszeniu #1?” albo „Które problemy warto obsłużyć najpierw?”. Priorytety AI zatwierdzasz przyciskami **Zapisz wybrane** albo **Zapisz wszystkie**. Przycisk **Nowa rozmowa** czyści historię w przeglądarce. Historia znika też po odświeżeniu strony; zapisane priorytety pozostają w bazie. Niedostępność lokalnego modelu jest widoczna w rozmowie i pozwala ponowić pytanie.

Cały zestaw opisów musi mieścić się w kontekście wybranego modelu; aplikacja nie pomija zgłoszeń po cichu. Uruchom serwer LLM i udostępnij modele przez ręczne wczytanie lub JIT loading przed użyciem czatu. Dane czatu są wysyłane do serwera wskazanego przez `LOCAL_CHAT_LLM_BASE_URL` (domyślnie `LOCAL_LLM_BASE_URL`), domyślnie lokalnego.

Przycisk **Zaproponuj priorytety** używa tego samego endpointu `/api/ai/chat` z polem `mode: "prioritize"`. Domyślnie backend przekazuje aktualne nierozwiązane zgłoszenia; analiza wskazanych numerów obejmuje tylko te zgłoszenia, także rozwiązane. Stosowany jest [JSON Schema w `response_format`](https://lmstudio.ai/docs/developer/openai-compat/structured-output). Model zwraca `summary` oraz tablicę `reports` z polami `id`, `priority` (`critical`, `high`, `medium`, `low`) i krótkim polskim `reason`. Backend sprawdza strukturę, długości tekstów, dozwolone priorytety i dokładnie jeden wynik dla każdego przekazanego numeru. Niepełna analiza, duplikaty i wymyślone numery są odrzucane w całości (HTTP 502).

Wyniki są uzupełniane tytułem, kategorią, adresem i statusem z migawki bazy, sortowane od krytycznego do niskiego i wyświetlane jako karty z kolorowymi oznaczeniami. Brakujące dane mają czytelne opisy zastępcze. Teksty AI są wstawiane przez `textContent`. Zapis wybranych propozycji używa `/api/ai/priorities/apply-selected` i wymaga jawnej, niepustej listy numerów z zatwierdzonej analizy. Starszy endpoint `/api/ai/priorities/apply` nadal pozwala zapisać wszystkie pozostałe propozycje. Jeśli nie ma zgłoszeń do analizy, model nie jest wywoływany. Analiza bez propozycji nie pokazuje przycisków zapisu. Odznaczenie wszystkich kart wyłącza **Zapisz wybrane**, ale pozostawia dostępne **Zapisz wszystkie**.

Prośby wpisane w rozmowie, np. „Pokaż podobne zgłoszenia i dodaj im priorytety” lub „give me only simular reports and add priorityes for them”, automatycznie uruchamiają tryb `similar` w tym samym endpointcie. Prośby o nadanie priorytetów uruchamiają tryb `prioritize` także bez klikania gotowego pytania. Wyjaśnienia pojęć i zwykłe pytania nadal korzystają ze swobodnej rozmowy. Frontend dobiera karty według trybu zwróconego przez backend.

W trybie podobieństwa model wybiera wyłącznie powiązane nierozwiązane zgłoszenia na podstawie treści opisów. Sama kategoria nie wystarcza. Opisy bez co najmniej dwóch słów liczących po trzy litery są pomijane jako niewystarczające do potwierdzenia podobieństwa. Każdy wynik zawiera własny priorytet, wzajemne odwołania `similar_to` do innych zwróconych wyników i `evidence` — dosłowny fragment opisu sprawdzany przez backend. Karty pokazują numery powiązanych zgłoszeń i ten fragment. Brak potwierdzonych podobieństw daje pustą listę z wyjaśnieniem, bez dopisywania znaczenia do testowych opisów. Jest to semantyczna sugestia modelu; sprawdzenie fragmentów potwierdza ich pochodzenie, ale nie zastępuje oceny administratora.

Zwykłe pytania i pozostałe gotowe pytania nadal korzystają z odpowiedzi tekstowych, bez wymuszania JSON Schema. Jeśli preset LM Studio opakowuje tekst w JSON, backend odczytuje odpowiedź tekstową z tego opakowania. Podstawowy Markdown w zwykłych odpowiedziach (tabele, pogrubienia, kursywa, nagłówki, listy, cytaty, kod i linki) jest wyświetlany przez lokalny renderer DOM bez dodatkowych zależności. Szerokie tabele i kod można przewijać poziomo. Surowy HTML pozostaje tekstem, obrazy nie są ładowane, a linki dopuszczają tylko HTTP, HTTPS i pocztę. Wiadomości użytkownika pozostają zwykłym tekstem. Dane analizy pozostają w historii jako czytelny tekst, więc można o nie dopytać. Błędy połączenia, ładowania modelu i autoryzacji LM Studio zwracają polskie komunikaty (HTTP 503) bez treści błędów serwera i kluczy. Wygaśnięcie sesji aplikacji (HTTP 401) kieruje do logowania.

Testy uprawnień, aktualności kontekstu i błędów czatu (bez uruchamiania modelu):

```bash
python -m unittest discover -s tests -v
```

Sprawdzenie w przeglądarce:

1. Uruchom LM Studio z pobranymi modelami oraz `python app.py`. Zaloguj się jako administrator i otwórz **Asystent AI**.
2. Kliknij **Zaproponuj priorytety**. Sprawdź kolejność i uzasadnienia. Przy trzech propozycjach zaznacz tylko pierwszą i trzecią, zapisz wybrane i sprawdź, że druga pozostała bez zmian. Następnie zatwierdź pozostałą propozycję lub użyj **Zapisz wszystkie**. Sprawdź też odrzucenie zmienionego wybranego zgłoszenia bez częściowego zapisu oraz brak blokady przy zmianie zgłoszenia odznaczonego.
3. Wpisz zwykłe pytanie, np. „Co opisano w zgłoszeniu #1?”, i dopytaj o poprzednią analizę. Odpowiedzi powinny pozostać tekstem.
4. Sprawdź szerokość mobilną (np. 390 px): karty powinny mieścić się w oknie, a rozmowa przewijać wewnątrz panelu.
5. W formularzu zgłoszenia dodaj zdjęcie i kliknij **Zaproponuj opis ze zdjęcia**. Opis nadal powinien pochodzić z modelu wizyjnego Qwen, a kolejne pytanie w czacie z modelu GPT-OSS.
6. Przy zatrzymanym serwerze LM Studio sprawdź czytelny błąd i możliwość ponowienia analizy. Testy automatyczne obejmują również błędny JSON, brakujące wyniki, nieznane numery, wszystkie priorytety, pustą listę i błędy autoryzacji.
7. Wpisz „give me only simular reports and add priorityes for them”. Wynik powinien zawierać wyłącznie potwierdzone pary lub grupy, priorytet każdego wyniku, powiązane numery i fragmenty opisów. Gdy brakuje danych lub podobieństw, powinien pojawić się komunikat zamiast przypadkowych grup kategorii.
8. W tabeli **Wszystkie zgłoszenia** sprawdź oba kierunki dla każdego pola sortowania. Zmień status lub priorytet podczas sortowania według tego pola i potwierdź, że aktualizowane jest właściwe zgłoszenie, które trafia na odpowiednie miejsce. Sprawdź kontrolkę sortowania przy szerokości 390 px i upewnij się, że linki zgłoszeń nadal otwierają właściwe szczegóły.
9. Otwórz **Zgłoś problem** i sprawdź, czy lista zawiera skonfigurowane kategorie domyślne, w tym osobne opcje **Droga** i **Chodnik**. Wyślij zgłoszenie w każdej z nich i sprawdź jej nazwę w szczegółach oraz na liście kategorii administratora, która służy tylko do odczytu. Uruchom backend ponownie i upewnij się, że kategorie się nie duplikują, nie ma dawnej opcji **Droga i chodnik**, a migrowane zgłoszenia zachowują identyfikatory i treść.

Po aktualizacji backendu uruchom ponownie `python app.py` i odśwież stronę. Zasoby czatu mają wersjonowane adresy, a serwer wymaga ponownej walidacji pamięci podręcznej, aby przeglądarka pobierała aktualny renderer.

## Scenariusz prezentacji

1. W strefie mieszkańca kliknij „Zgłoś problem”.
2. Dodaj zdjęcie. Opis możesz wpisać samodzielnie albo zostawić pusty.
3. Backend wyśle zdjęcie do lokalnego modelu wizyjnego i zwróci sugestię opisu. Mieszkaniec może ją zaakceptować, zmienić lub wpisać własny tekst przed wysłaniem.
4. W strefie mieszkańca sprawdź listę własnych zgłoszeń i ich statusy. Po zmianie priorytetu przez administratora upewnij się, że karty i szczegóły mieszkańca nadal pokazują status naprawy bez priorytetu, a odpowiedzi API pomijają pola priorytetu.
5. W panelu administratora zmień status zgłoszenia i pokaż zapis w `audit_log`.
6. Zmień priorytet jednego zgłoszenia ręcznie, następnie otwórz Asystenta AI, sprawdź propozycje i zapisz je. Odśwież stronę, aby potwierdzić zapis.

## Zgodność z raportem

Zaimplementowano oddzielone strefy mieszkańca (przycisk dodania problemu i statusy własnych zgłoszeń) oraz administratora (wszystkie zgłoszenia, statusy, kategorie, mapa, audyt). Lokalny AI działa po stronie backendu: analizuje zdjęcie i przygotowuje edytowalną sugestię, a także obsługuje chat administratora. System udostępnia REST API i relacyjną bazę SQLite.
