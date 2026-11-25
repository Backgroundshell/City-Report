function createLocationPicker(modal, setAddressBusy) {
    const address = modal.querySelector('#location-address');
    const searchHint = address.placeholder;
    const search = modal.querySelector('#location-search');
    const gps = modal.querySelector('#location-gps');
    const results = modal.querySelector('#location-results');
    const status = modal.querySelector('#location-status');
    const container = modal.querySelector('#location-map');
    const tileError = modal.querySelector('#tile-error');
    const map = createReportMap(container, tileError).setView(krakowCenter, 13);

    let marker;
    let selected;
    let pending;

    function resetSelection() {
        pending?.abort();
        address.placeholder = searchHint;
        setAddressBusy(false);
        pending = new AbortController();
        results.replaceChildren();
        marker?.remove();
        marker = null;
        selected = null;
        search.disabled = !address.value.trim();
        gps.disabled = false;
        status.textContent = '';
        return pending.signal;
    }

    function placeMarker(latlng, label, center) {
        selected = {latitude: latlng.lat, longitude: latlng.lng, address: label};
        marker = L.marker(latlng, {alt: 'Miejsce zgłoszenia', keyboard: false}).addTo(map);
        if (center) map.setView(latlng, Math.max(map.getZoom(), 17), {animate: false});
    }

    async function lookup(method, data, signal) {
        const response = await api('/api/locations/' + method, data, signal);
        if (!response.ok) throw new Error();
        return (await response.json()).places;
    }

    async function selectPoint(latlng, label, center) {
        address.value = '';
        const signal = resetSelection();
        placeMarker(latlng, label, center);
        address.placeholder = 'Ustalanie adresu…';
        status.textContent = 'Ustalanie adresu zaznaczonego punktu…';
        setAddressBusy(true);
        try {
            const places = await lookup('reverse', selected, signal);
            if (signal.aborted) return;
            if (!places.length) {
                address.placeholder = 'Brak adresu w pobliżu punktu';
                status.textContent = 'Brak adresu w pobliżu. Możesz wysłać zgłoszenie z zaznaczonym punktem.';
                return;
            }
            const nearest = places[0].address;
            address.value = nearest;
            address.placeholder = searchHint;
            selected.address = nearest;
            search.disabled = false;
            const popup = document.createElement('span');
            popup.textContent = nearest;
            marker.bindPopup(popup).openPopup();
            status.textContent = 'Najbliższy adres – ' + nearest;
        } catch {
            if (!signal.aborted) {
                address.placeholder = 'Nie udało się pobrać adresu';
                status.textContent = 'Nie udało się pobrać adresu. Możesz wysłać zgłoszenie z zaznaczonym punktem.';
            }
        } finally {
            if (!signal.aborted) setAddressBusy(false);
        }
    }

    function selectAddress(place) {
        address.value = place.address;
        resetSelection();
        placeMarker(L.latLng(place.latitude, place.longitude), place.address, true);
        status.textContent = 'Zaznaczono na mapie – ' + place.address;
    }

    async function searchAddress() {
        const query = address.value.trim();
        if (!query || search.disabled) return;
        const signal = resetSelection();
        search.disabled = true;
        status.textContent = 'Wyszukiwanie adresu…';
        const center = map.getCenter().wrap();
        try {
            const places = await lookup('search', {query, latitude: center.lat, longitude: center.lng}, signal);
            if (signal.aborted) return;
            if (places.length === 1) {
                selectAddress(places[0]);
                return;
            }
            status.textContent = places.length ? 'Wybierz adres z listy.' : 'Nie znaleziono adresu. Dopisz miejscowość lub wskaż punkt na mapie.';
            for (const place of places) {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = place.address;
                button.onclick = () => selectAddress(place);
                results.append(button);
            }
            results.firstElementChild?.focus();
        } catch {
            if (!signal.aborted) status.textContent = 'Nie udało się wyszukać adresu. Spróbuj ponownie, wskaż punkt na mapie lub użyj GPS.';
        } finally {
            if (!signal.aborted) search.disabled = false;
        }
    }

    search.disabled = true;
    search.onclick = searchAddress;
    address.oninput = resetSelection;
    address.onkeydown = event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            searchAddress();
        }
    };
    map.on('click', event => selectPoint(event.latlng.wrap(), 'Punkt wskazany na mapie', false));
    container.addEventListener('keydown', event => {
        if (event.target === container && event.key === 'Enter') {
            event.preventDefault();
            selectPoint(map.getCenter().wrap(), 'Punkt wskazany na mapie', false);
        }
    });
    gps.onclick = () => {
        const signal = resetSelection();
        if (!window.isSecureContext || !navigator.geolocation) {
            status.textContent = 'GPS jest niedostępny. Wyszukaj adres lub wskaż punkt na mapie.';
            return;
        }
        gps.disabled = true;
        status.textContent = 'Ustalanie lokalizacji urządzenia…';
        navigator.geolocation.getCurrentPosition(position => {
            if (signal.aborted) return;
            const coords = position.coords;
            selectPoint(L.latLng(coords.latitude, coords.longitude), 'Lokalizacja GPS', true);
        }, error => {
            if (signal.aborted) return;
            gps.disabled = false;
            const reason = error.code === 1 ? 'Brak zgody na lokalizację.' : 'Nie udało się ustalić lokalizacji.';
            status.textContent = reason + ' Wyszukaj adres lub wskaż punkt na mapie.';
        }, {enableHighAccuracy: true, timeout: 12000, maximumAge: 0});
    };
    modal.addEventListener('close', () => {
        pending?.abort();
        map.remove();
    }, {once: true});

    return {
        selectedLocation() {
            if (!selected) {
                status.textContent = 'Wybierz adres z wyszukiwarki, wskaż punkt na mapie lub użyj GPS.';
                (results.firstElementChild || address).focus();
            }
            return selected;
        },
    };
}
