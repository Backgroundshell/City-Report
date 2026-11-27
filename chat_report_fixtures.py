"""Fictional Polish reports for exercising the administrator AI chatbot."""

from datetime import datetime, timedelta


# Addresses and coordinates illustrate Kraków locations; no real incidents are alleged.
LOCATIONS = (
    ("ul. Długa 12, Kraków", 50.0694, 19.9404),
    ("ul. Karmelicka 18, Kraków", 50.0669, 19.9315),
    ("ul. Starowiślna 33, Kraków", 50.0543, 19.9454),
    ("ul. Dietla 45, Kraków", 50.0519, 19.9402),
    ("ul. Mogilska 25, Kraków", 50.0676, 19.9679),
    ("ul. Zwierzyniecka 15, Kraków", 50.0569, 19.9290),
    ("ul. Kalwaryjska 28, Kraków", 50.0419, 19.9454),
    ("ul. Wielicka 42, Kraków", 50.0320, 19.9668),
    ("al. Pokoju 10, Kraków", 50.0586, 19.9711),
    ("ul. Lubicz 20, Kraków", 50.0658, 19.9506),
    ("ul. Rakowicka 18, Kraków", 50.0730, 19.9510),
    ("ul. Wadowicka 8, Kraków", 50.0297, 19.9409),
    ("ul. Wrocławska 21, Kraków", 50.0815, 19.9299),
    ("ul. Lea 12, Kraków", 50.0716, 19.9187),
    ("os. Centrum A 5, Kraków", 50.0736, 20.0434),
)

# Each scenario provides four related reports and one distinct issue in the same
# category. Category alone must not be enough to establish similarity.
# Fields: category, title, shared description, three observations, distinct title/description.
SCENARIOS = (
    ("Droga", "Głęboka dziura na pasie ruchu",
     "Na prawym pasie jezdni jest głęboka dziura z ostrą krawędzią. Samochody gwałtownie ją omijają, wjeżdżając na sąsiedni pas.",
     ("W ubytku zbiera się woda.", "Dziura znajduje się przed przejściem dla pieszych.", "Luźne fragmenty asfaltu leżą obok ubytku."),
     "Plama oleju na jezdni", "Na zakręcie rozlana jest śliska substancja przypominająca olej. Ślad ciągnie się przez kilka metrów przy krawężniku."),
    ("Droga", "Popękany asfalt przy skrzyżowaniu",
     "Asfalt przy skrzyżowaniu ma podłużne pęknięcia i drobne wykruszenia. Nawierzchnia jest przejezdna, ale uszkodzenie stopniowo się powiększa.",
     ("Szczelina biegnie wzdłuż prawego pasa.", "Po deszczu z pęknięcia wypłukuje się kruszywo.", "Uszkodzenie ma około dwóch metrów długości."),
     "Woda zalega na poboczu", "Po opadach na poboczu pozostaje szeroka kałuża. Wpust przy krawężniku jest zasłonięty liśćmi i nie odbiera wody."),
    ("Droga", "Zapadnięta pokrywa studzienki na jezdni",
     "Pokrywa studzienki na jezdni zapadła się poniżej poziomu asfaltu. Przejeżdżające autobusy mocno podskakują, a wokół ramy kruszy się nawierzchnia.",
     ("Zagłębienie jest słabo widoczne po zmroku.", "Rama pokrywy porusza się pod kołami.", "Słychać głośne uderzenia przy każdym przejeździe."),
     "Uszkodzony próg zwalniający", "Od progu zwalniającego odłączył się gumowy segment. Pozostałe mocowania wystają z jezdni i mogą uszkodzić oponę."),
    ("Chodnik", "Wystające płyty chodnikowe",
     "Kilka płyt chodnika wystaje ponad sąsiednie płyty. Piesi potykają się o krawędzie, a wózek dziecięcy trudno przeprowadzić przez nierówność.",
     ("Największy uskok jest przy wejściu do sklepu.", "Jedna płyta kołysze się pod stopą.", "Nierówność zajmuje prawie całą szerokość chodnika."),
     "Brak pasa prowadzącego dla osób niewidomych", "Przy przebudowanym przejściu brakuje wyczuwalnych oznaczeń prowadzących. Osoba z białą laską nie ma ciągłego oznaczenia dojścia do przejścia."),
    ("Chodnik", "Śliski chodnik przy przystanku",
     "Chodnik przy przystanku jest pokryty ubitym śniegiem i lodem. Nie widać śladów posypania, a piesi ślizgają się przy dojściu do autobusu.",
     ("Lód zalega również przy krawędzi przejścia.", "W tym miejscu przewróciła się starsza osoba.", "Oblodzenie obejmuje odcinek około dwudziestu metrów."),
     "Kratka wokół drzewa blokuje przejście", "Metalowa kratka wokół drzewa odgięła się i wystaje na chodnik. Jej krawędź zahacza o koła wózków."),
    ("Chodnik", "Wykruszony stopień schodów terenowych",
     "Na schodach prowadzących do ciągu pieszego wykruszył się stopień. Powstała szeroka szczelina, a schodzący piesi tracą oparcie stopy.",
     ("Uszkodzenie znajduje się na drugim stopniu od góry.", "Przy krawędzi leżą odłamki betonu.", "Po zmroku ubytku prawie nie widać."),
     "Luźna poręcz przy kładce", "Poręcz kładki dla pieszych rusza się przy lekkim nacisku. Dolne mocowanie jest odkręcone, a obok znajduje się stromy spadek."),
    ("Oświetlenie", "Trzy latarnie nie świecą",
     "Trzy kolejne latarnie przy ciągu pieszym nie świecą po zmroku. Odcinek między przejściem a przystankiem pozostaje zupełnie ciemny.",
     ("Pozostałe lampy przy tej ulicy działają.", "Ciemność utrudnia dostrzeżenie pieszych przy przejściu.", "Awaria powtarza się przez kolejne wieczory."),
     "Reflektor świeci bezpośrednio w okna", "Oprawa latarni jest skierowana w stronę mieszkań. Silne światło wpada do sypialni zamiast oświetlać chodnik pod słupem."),
    ("Oświetlenie", "Otwarte drzwiczki słupa oświetleniowego",
     "W słupie oświetleniowym brakuje osłony skrzynki z przewodami. Dostępne są elementy instalacji elektrycznej na wysokości ręki dziecka.",
     ("Przewody są widoczne od strony chodnika.", "Obok słupa często przechodzą dzieci do szkoły.", "Osłona leży na ziemi przy podstawie słupa."),
     "Pochylony słup latarni", "Słup latarni jest wyraźnie pochylony po uderzeniu pojazdu. Przy fundamencie pojawiła się szczelina i pęknięcia betonu."),
    ("Oświetlenie", "Latarnie świecą w środku dnia",
     "Latarnie na krótkim odcinku ulicy pozostają włączone w słoneczny dzień. Sąsiednie odcinki są wyłączone, więc problem wygląda na lokalny.",
     ("Lampy były włączone również poprzedniego południa.", "Nie widać prowadzonych prac serwisowych.", "Dotyczy to pięciu kolejnych opraw."),
     "Migająca oprawa przy przejściu", "Jedna latarnia przy przejściu szybko miga i na chwilę gaśnie. Zmienny strumień światła utrudnia dostrzeżenie osób na pasach."),
    ("Czystość", "Porzucone odpady remontowe",
     "Obok osiedlowego pojemnika ktoś pozostawił worki z gruzem i połamane płyty. Odpady zajmują część przejścia i przybywa ich po weekendach.",
     ("Z jednego worka wysypuje się tynk.", "Wśród odpadów znajdują się ostre fragmenty płytek.", "Sterta utrudnia dostęp do pojemników."),
     "Brudna toaleta publiczna", "W toalecie publicznej podłoga i umywalka są mocno zabrudzone. Brakuje mydła, a kosz na ręczniki jest pełny."),
    ("Czystość", "Przepełnione kosze przy przystanku",
     "Kosze przy przystanku są przepełnione, a opakowania leżą wokół nich. Wiatr roznosi śmieci na chodnik i pobliski trawnik.",
     ("Pokrywa jednego pojemnika nie daje się zamknąć.", "Odpady utrzymują się tu od kilku dni.", "Resztki jedzenia przyciągają ptaki."),
     "Graffiti na miejskiej tablicy", "Na tablicy informacyjnej pojawiły się napisy wykonane farbą. Część planu okolicy jest zasłonięta i nie można odczytać nazw ulic."),
    ("Czystość", "Rozbite szkło na ciągu pieszym",
     "Na chodniku obok placu zabaw leżą odłamki rozbitej butelki. Szkło znajduje się na trasie dzieci i osób wyprowadzających psy.",
     ("Drobne odłamki rozsypały się na szerokości przejścia.", "Najwięcej szkła jest przy ławce.", "Odłamki leżą również na sąsiedniej trawie."),
     "Psie odchody przy wejściu do parku", "Trawnik i pobocze ścieżki przy wejściu do parku są zabrudzone psimi odchodami. Najbliższy pojemnik na woreczki jest pusty."),
    ("Zieleń", "Nadłamana gałąź nad chodnikiem",
     "Duża nadłamana gałąź zwisa nad uczęszczanym chodnikiem. Przy wietrze mocno się porusza i może spaść na przechodzącą osobę.",
     ("Pęknięcie widać przy połączeniu z pniem.", "Pod gałęzią przechodzą rodzice z dziećmi.", "Obok leżą świeże fragmenty kory."),
     "Chwasty zarastają rabatę", "Miejska rabata jest zarośnięta wysokimi chwastami. Rośliny ozdobne są słabo widoczne, ale przejście pozostaje wolne."),
    ("Zieleń", "Powalone drzewo blokuje alejkę",
     "Po silnym wietrze powalone drzewo zablokowało parkową alejkę. Przejazd wózkiem jest niemożliwy, a piesi omijają pień przez błoto.",
     ("Korzenie drzewa wyrwały fragment nawierzchni.", "Gałęzie zajmują całą szerokość alejki.", "Przeszkoda jest tuż przy głównym wejściu."),
     "Usychające kwiaty w miejskich donicach", "Kwiaty w dużych donicach mają suche liście, a ziemia jest spękana. Donice wyglądają na niepodlewane od dłuższego czasu."),
    ("Zieleń", "Zaniedbany trawnik przy skwerze",
     "Trawnik na skwerze jest bardzo wysoki i miejscami wyschnięty. Nie widać świeżego koszenia, a ścieżka pozostaje dostępna dla pieszych.",
     ("Wysoka trawa zasłania niskie obrzeże.", "Problem obejmuje większą część skweru.", "Teren nie ma oznaczenia łąki kwietnej."),
     "Żywopłot zwęża przejście", "Rozrośnięty żywopłot wchodzi na chodnik i pozostawia wąskie przejście. Dwie osoby nie mogą się minąć bez zejścia na pobocze."),
    ("Oznakowanie i sygnalizacja", "Nie działa czerwone światło dla pieszych",
     "Na przejściu dla pieszych nie świeci czerwony sygnał w jednym sygnalizatorze. Piesi nie wiedzą, czy urządzenie działa podczas ruchu samochodów.",
     ("Zielony sygnał włącza się prawidłowo.", "Awaria dotyczy strony od przystanku.", "Na sąsiednim przejściu sygnalizator działa."),
     "Sprzeczne znaki przy remoncie", "Przy remontowanej ulicy pozostawiono sprzeczne znaki kierunku jazdy. Tymczasowy znak nakazuje skręt w stronę zamkniętego wjazdu."),
    ("Oznakowanie i sygnalizacja", "Poluzowany znak pierwszeństwa",
     "Znak pierwszeństwa przekrzywił się i obraca na słupku. Dla kierowców nadjeżdżających z jednej strony jego tarcza jest prawie niewidoczna.",
     ("Obejma mocująca jest wyraźnie luźna.", "Po podmuchach wiatru znak zmienia położenie.", "Słupek stoi przy ruchliwym skrzyżowaniu."),
     "Brakuje tabliczki z nazwą ulicy", "Na narożniku budynku brakuje tabliczki z nazwą ulicy. Pozostały uchwyty, a osoby szukające adresu mylą wejścia."),
    ("Oznakowanie i sygnalizacja", "Starte pasy na przejściu",
     "Oznakowanie poziome przejścia dla pieszych jest mocno starte. Po deszczu pasy słabo odróżniają się od asfaltu przy dojeździe do szkoły.",
     ("Najbardziej wytarte są dwa środkowe pasy.", "Wieczorem kierowcy późno dostrzegają przejście.", "Nie widać śladów niedawnego odmalowania."),
     "Nie działa sygnał dźwiękowy przejścia", "Przycisk na przejściu włącza zielone światło, ale nie słychać sygnału dla osób niewidomych. Po drugiej stronie dźwięk działa."),
    ("Parkowanie", "Samochody blokują chodnik przy przejściu",
     "Zaparkowane samochody zajmują chodnik przy przejściu. Osoba na wózku musi wjechać na jezdnię, a auta zasłaniają widoczność pieszych.",
     ("Wolne przejście ma mniej niż pół metra.", "Zastawiony jest również obniżony krawężnik.", "Problem powtarza się w godzinach popołudniowych."),
     "Nieczytelny wyświetlacz parkomatu", "Wyświetlacz parkomatu jest ciemny i nie pokazuje dostępnych opcji. Nie można odczytać komunikatów przed rozpoczęciem płatności."),
    ("Parkowanie", "Porzucony samochód na parkingu",
     "Na miejskim parkingu od wielu tygodni stoi uszkodzony samochód bez tablic. Ma spuszczone opony i zajmuje wyznaczone miejsce postojowe.",
     ("Pod pojazdem zbierają się stare liście.", "Rozbite okno osłonięto folią.", "Stan auta nie zmienia się od kilku tygodni."),
     "Nieczytelne oznaczenie miejsca dostępnego", "Na miejscu dla osób z niepełnosprawnościami wytarło się niebieskie oznakowanie. Symbol jest trudny do rozpoznania, a znak pionowy został uszkodzony."),
    ("Transport publiczny", "Rozbita szyba wiaty przystankowej",
     "Boczna szyba wiaty przystankowej jest rozbita. Ostre fragmenty pozostają w ramie, a drobne szkło leży przy siedzeniu dla pasażerów.",
     ("Uszkodzona tafla jest od strony chodnika.", "Pasażerowie stoją tuż przy ostrych krawędziach.", "Brakuje oznaczenia odgradzającego uszkodzoną część wiaty."),
     "Urwany komunikat głosowy na przystanku", "Urządzenie informacji pasażerskiej ucina komunikat przed podaniem kierunku jazdy. Wyświetlacz działa, ale zapowiedzi są niepełne."),
    ("Transport publiczny", "Nieaktualny rozkład na przystanku",
     "W gablocie przystanku znajduje się nieaktualny rozkład jazdy. Podane godziny nie zgadzają się z datą obowiązującej zmiany i informacją elektroniczną.",
     ("Na kartce widnieje poprzedni termin ważności.", "Pasażerowie pytają o odjazdy usuniętego kursu.", "Sąsiednia gablota ma już nowy rozkład."),
     "Zatrzymany zegar przystankowy", "Zegar na wiacie pokazuje przez cały dzień tę samą godzinę. Tablica odjazdów obok działa prawidłowo i nie wymaga naprawy."),
    ("Infrastruktura rowerowa", "Ubytek asfaltu na drodze rowerowej",
     "Na drodze rowerowej powstał głęboki ubytek nawierzchni. Przednie koło może wpaść w szczelinę, szczególnie gdy miejsce jest zasłonięte kałużą.",
     ("Uszkodzenie znajduje się na łuku trasy.", "Rowerzyści omijają je przez chodnik.", "Krawędź ubytku jest ostra i wykruszona."),
     "Nie działa stacja naprawy rowerów", "W publicznej stacji naprawczej brakuje końcówki pompki i dwóch narzędzi. Sam stojak jest stabilny, ale nie można dopompować koła."),
    ("Infrastruktura rowerowa", "Luźny stojak rowerowy",
     "Stojak rowerowy porusza się w fundamencie i można go unieść. Przypięty rower nie jest stabilny, a część mocowań została wyrwana.",
     ("Jedna stopa stojaka odstaje od podłoża.", "Przy mocowaniu widać wykruszony beton.", "Pozostałe stojaki w rzędzie są stabilne."),
     "Brakuje kierunkowskazu trasy rowerowej", "Na rozwidleniu trasy rowerowej brakuje strzałki wskazującej dalszy przebieg. Rowerzyści zatrzymują się i szukają oznaczeń."),
    ("Mała architektura", "Pęknięta deska ławki z wystającą śrubą",
     "Na miejskiej ławce pękła deska siedziska i wystaje ostra śruba. Siadająca osoba może się skaleczyć lub uszkodzić ubranie.",
     ("Uszkodzona deska jest na środku siedziska.", "Ławka znajduje się przy często używanej alejce.", "Obok śruby odstają ostre drzazgi."),
     "Niedziałające poidełko miejskie", "Po naciśnięciu przycisku poidełka nie wypływa woda. Przycisk wraca na miejsce, a wokół urządzenia nie widać wycieku."),
    ("Mała architektura", "Brak słupka oddzielającego chodnik",
     "Z mocowania wyrwano słupek oddzielający chodnik od jezdni. W nawierzchni pozostał niezabezpieczony otwór i fragment metalowej podstawy.",
     ("Metalowa krawędź wystaje przy przejściu.", "Przy otworze nie ustawiono żadnej osłony.", "Pozostałe słupki stoją w tym samym rzędzie."),
     "Porysowana mapa turystyczna", "Przezroczysta osłona miejskiej mapy jest porysowana. Najmniejsze opisy trudno odczytać, ale tablica stoi stabilnie i nie ma ostrych krawędzi."),
    ("Place zabaw i rekreacja", "Uszkodzony łańcuch huśtawki",
     "Jedno ogniwo łańcucha huśtawki jest pęknięte i mocno odkształcone. Siedzisko przechyla się przy obciążeniu, a urządzenie pozostaje dostępne dla dzieci.",
     ("Uszkodzenie jest przy górnym mocowaniu.", "Obok nie ma informacji o wyłączeniu urządzenia.", "Przy poruszaniu łańcuch wydaje trzaski."),
     "Zablokowana furtka placu zabaw", "Furtka placu zabaw klinuje się o nawierzchnię. Rodzic z wózkiem nie może jej szeroko otworzyć mimo godzin dostępności obiektu."),
    ("Place zabaw i rekreacja", "Poluzowane mocowanie urządzenia siłowni",
     "Urządzenie na siłowni plenerowej kołysze się w podstawie. Dwie śruby mocujące są luźne, co grozi przewróceniem podczas ćwiczeń.",
     ("Podstawa odrywa się lekko od podłoża.", "Ruch jest widoczny już przy małym obciążeniu.", "Nie zabezpieczono dostępu do urządzenia."),
     "Brak siatki w koszu do koszykówki", "Na osiedlowym boisku brakuje siatki pod obręczą. Sama obręcz i tablica są stabilne, a boisko można bezpiecznie użytkować."),
    ("Inne", "Silny zapach kanalizacji przy wejściu",
     "Przy wejściu do przejścia podziemnego utrzymuje się silny zapach kanalizacji. Zapach nasila się po opadach i dochodzi z kratki w posadzce.",
     ("Najsilniej czuć go przy dolnym podeście.", "Na posadzce obok kratki pojawia się wilgoć.", "Problem powtarza się od kilku dni."),
     "Uszkodzone drzwi toalety miejskiej", "Automatyczne drzwi toalety miejskiej zatrzymują się w połowie otwarcia. Użytkownik z wózkiem nie może bez przeszkód wejść do środka."),
    ("Inne", "Nocny hałas wentylatora miejskiego obiektu",
     "Wentylator przy miejskim obiekcie wydaje nocą jednostajny metaliczny hałas. Dźwięk jest słyszalny z zewnątrz mimo zamknięcia budynku.",
     ("Hałas nasila się po uruchomieniu wentylatora.", "Słychać regularne uderzenia obudowy.", "W dzień ten dźwięk jest znacznie cichszy."),
     "Przeciekający dach przejścia podziemnego", "Z sufitu przejścia podziemnego kapie woda i tworzy się mokra plama. Tynk przy zacieku zaczyna się łuszczyć."),
)


def seed(connection, timestamp):
    """Insert missing fixture markers while preserving existing reports and edits."""
    resident = connection.execute("SELECT id FROM users WHERE role='Mieszkaniec' ORDER BY id LIMIT 1").fetchone()
    if resident is None:
        raise ValueError("Brak konta mieszkańca. Najpierw uruchom aplikację.")
    categories = {row["name"]: row["id"] for row in connection.execute("SELECT id,name FROM categories")}
    missing = {scenario[0] for scenario in SCENARIOS} - categories.keys()
    if missing:
        raise ValueError("Brak kategorii: " + ", ".join(sorted(missing)) + ". Uruchom aplikację ponownie.")
    markers = {row[0] for row in connection.execute(
        "SELECT substr(title,1,13) FROM reports WHERE substr(title,1,9)='[TEST AI '")}
    anchor = datetime.fromisoformat(timestamp)
    values = []
    for group, (category, title, description, observations, other_title, other_description) in enumerate(SCENARIOS):
        for variant in range(5):
            number = group * 5 + variant + 1
            marker = f"[TEST AI {number:03d}]"
            if marker in markers:
                continue
            distinct = variant == 4
            address, latitude, longitude = LOCATIONS[(group + (6 if distinct else 0)) % len(LOCATIONS)]
            status = ("Nowe", "W toku", "Rozwiązane")[group % 3] if distinct else ("Nowe", "Nowe", "W toku", "Rozwiązane")[variant]
            text = other_description if distinct else description + (" " + observations[variant - 1] if variant else "")
            created = anchor - timedelta(days=5 + group * 11 % 80 - min(variant, 3), hours=number % 8)
            updated = created + (timedelta(days=1) if status != "Nowe" else timedelta())
            values.append((resident["id"], categories[category], marker + " " + (other_title if distinct else title),
                           text, address, latitude, longitude, status, created.isoformat(timespec="seconds"),
                           updated.isoformat(timespec="seconds")))
    connection.executemany("""INSERT INTO reports
        (user_id,category_id,title,description,address,latitude,longitude,status,created_at,updated_at,description_source)
        VALUES(?,?,?,?,?,?,?,?,?,?,'manual')""", values)
    return len(values)
