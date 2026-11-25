const krakowCenter = [50.0618, 19.9383];

const reportMapSymbols = {
    new: '<path d="M12 7v10M7 12h10"/>',
    progress: '<circle cx="12" cy="12" r="7"/><path d="M12 8v4l3 2"/>',
    resolved: '<path d="m6 12 4 4 8-8"/>',
    selected: '<circle cx="12" cy="12" r="4"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/>',
};

function reportMapStatus(status) {
    switch (status) {
        case 'Nowe': return 'new';
        case 'W toku': return 'progress';
        case 'Rozwiązane': return 'resolved';
        default: return 'selected';
    }
}

function createReportIcon(status, count = 1) {
    const kind = count > 1 ? 'group' : reportMapStatus(status);
    const content = count > 1 ? String(count)
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            + reportMapSymbols[kind] + '</svg>';
    return L.divIcon({
        className: 'report-marker report-marker--' + kind,
        html: '<span class="report-marker-face" aria-hidden="true">' + content + '</span>',
        iconSize: [30, 36],
        iconAnchor: [15, 34],
        popupAnchor: [0, -30],
    });
}

function createReportMap(container, tileError, options = {}) {
    container.classList.add('report-map');
    const map = L.map(container, {...options, zoomControl: false});
    L.control.zoom({position: 'bottomright', zoomInTitle: 'Przybliż', zoomOutTitle: 'Oddal'}).addTo(map);
    L.control.scale({position: 'bottomleft', imperial: false, maxWidth: 100}).addTo(map);
    function resizePopup(popup) {
        const size = map.getSize();
        const bottomPadding = size.x < 400 ? 120 : 24;
        popup.options.maxWidth = Math.max(100, Math.min(290, size.x - 72));
        popup.options.minWidth = Math.min(200, popup.options.maxWidth);
        popup.options.maxHeight = Math.max(80, Math.min(250, size.y - bottomPadding - 64));
        popup.options.autoPanPaddingTopLeft = L.point(16, 16);
        popup.options.autoPanPaddingBottomRight = L.point(16, bottomPadding);
        popup.update();
    }
    map.on('popupopen', event => resizePopup(event.popup));
    map.on('resize', () => map.eachLayer(layer => {
        if (layer instanceof L.Popup) resizePopup(layer);
    }));
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        className: 'report-map-tiles',
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).on('tileerror', () => { tileError.hidden = false; })
      .on('tileload', () => { tileError.hidden = true; }).addTo(map);
    if (typeof ResizeObserver === 'function') {
        let active = true;
        const observer = new ResizeObserver(entries => {
            if (active && entries.some(entry => entry.contentRect.width > 0 && entry.contentRect.height > 0)) {
                map.invalidateSize({animate: false, pan: true});
            }
        });
        map.whenReady(() => observer.observe(container));
        map.on('unload', () => { active = false; observer.disconnect(); });
    }
    return map;
}

function hasReportPoint({latitude, longitude}) {
    return Number.isFinite(latitude) && Math.abs(latitude) <= 90
        && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

const reportLocationDialog = document.querySelector('#report-location-dialog');
document.querySelector('#report-location-close').addEventListener('click', () => reportLocationDialog.close());
window.addEventListener('hashchange', () => {
    if (reportLocationDialog.open) reportLocationDialog.close();
});

function openReportLocation(report) {
    if (!hasReportPoint(report) || reportLocationDialog.open) return;
    document.querySelector('#report-location-title').textContent = 'Mapa zgłoszenia #' + report.id;
    document.querySelector('#report-location-address').textContent = report.address || 'Brak adresu.';
    const error = document.querySelector('#report-location-error');
    error.hidden = true;
    reportLocationDialog.showModal();
    // A dialog can close mid-zoom, so avoid transitions that outlive its map.
    const map = createReportMap(document.querySelector('#report-location-map'), error, {zoomAnimation: false})
        .setView([report.latitude, report.longitude], 17);
    const title = report.title || 'Zgłoszenie #' + report.id;
    const marker = L.marker([report.latitude, report.longitude], {
        icon: createReportIcon(report.status), title, alt: title,
    });
    marker.on('add', () => marker.getElement().setAttribute('aria-label', title + ' · ' + report.status));
    marker.addTo(map);
    const popup = document.createElement('div');
    const heading = document.createElement('strong');
    heading.textContent = title;
    const address = document.createElement('p');
    address.textContent = report.address || 'Brak adresu.';
    popup.append(heading, address);
    marker.bindPopup(popup);
    reportLocationDialog.addEventListener('close', () => map.remove(), {once: true});
}

function reportMapList(reports) {
    const list = document.createElement('ul');
    list.className = 'map-report-list';
    for (const report of reports) {
        const item = document.createElement('li');
        const meta = document.createElement('div');
        meta.className = 'map-report-meta';
        const number = document.createElement('span');
        number.className = 'map-report-number';
        number.textContent = '#' + report.id;
        const status = document.createElement('span');
        status.className = 'map-status map-status--' + reportMapStatus(report.status);
        status.textContent = report.status;
        const priority = document.createElement('span');
        priority.className = 'priority-badge priority-' + reportPriority(report.priority);
        priority.textContent = reportPriorityLabel(report.priority);
        meta.append(number, status, priority);
        const link = document.createElement('a');
        link.className = 'report-link map-report-title';
        link.href = '#/reports/' + report.id;
        link.textContent = report.title;
        const info = document.createElement('small');
        info.textContent = report.address || 'Brak adresu';
        item.append(meta, link, info);
        list.append(item);
    }
    return list;
}

let dashboardMap;
let dashboardMarkers;
let plottedReports;

function fitAdminMap() {
    const bounds = dashboardMarkers.getBounds();
    if (bounds.isValid()) dashboardMap.fitBounds(bounds, {padding: [48, 56], maxZoom: 16, animate: false});
    else dashboardMap.setView(krakowCenter, 13);
}

function renderAdminMap(reports) {
    if (!dashboardMap) {
        dashboardMap = createReportMap(document.querySelector('#admin-map'), document.querySelector('#admin-map-error'));
        dashboardMarkers = L.featureGroup().addTo(dashboardMap);
        document.querySelector('#admin-map-fit').addEventListener('click', fitAdminMap);
    }
    dashboardMap.invalidateSize({animate: false, pan: true});
    if (plottedReports === reports) return;
    plottedReports = reports;

    const groups = new Map();
    const unmapped = [];
    for (const report of reports) {
        if (!hasReportPoint(report)) {
            unmapped.push(report);
            continue;
        }
        const key = report.latitude + ',' + report.longitude;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(report);
    }

    const oldBounds = dashboardMarkers.getBounds();
    dashboardMarkers.clearLayers();
    for (const group of groups.values()) {
        const first = group[0];
        const title = group.length === 1 ? '#' + first.id + ' ' + first.title : 'Zgłoszenia w tym miejscu (' + group.length + ')';
        const options = {title, alt: title, icon: createReportIcon(first.status, group.length)};
        const marker = L.marker([first.latitude, first.longitude], options);
        marker.on('add', () => marker.getElement().setAttribute('aria-label', title + (group.length === 1 ? ' · ' + first.status : '')));
        marker.addTo(dashboardMarkers);
        marker.bindPopup(() => reportMapList(group), {maxHeight: 250, minWidth: 220, maxWidth: 290});
    }

    const bounds = dashboardMarkers.getBounds();
    if (!bounds.isValid() || !oldBounds.isValid() || !oldBounds.equals(bounds)) fitAdminMap();
    document.querySelector('#admin-map-fit').disabled = !bounds.isValid();
    const mapped = reports.length - unmapped.length;
    document.querySelector('#admin-map-summary').textContent = reports.length
        ? 'Na mapie ' + mapped + ' z ' + reports.length + ' zgłoszeń.'
        : 'Brak zgłoszeń.';
    const missing = document.querySelector('#admin-map-missing');
    missing.hidden = !unmapped.length;
    missing.querySelector('summary').textContent = 'Zgłoszenia bez położenia na mapie (' + unmapped.length + ')';
    missing.querySelector('div').replaceChildren(reportMapList(unmapped));
}
