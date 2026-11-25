const krakowCenter = [50.0618, 19.9383];

function createReportMap(container, tileError) {
    const map = L.map(container, {zoomControl: false});
    L.control.zoom({zoomInTitle: 'Przybliż', zoomOutTitle: 'Oddal'}).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).on('tileerror', () => { tileError.hidden = false; })
      .on('tileload', () => { tileError.hidden = true; }).addTo(map);
    return map;
}

function hasReportPoint({latitude, longitude}) {
    return Number.isFinite(latitude) && Math.abs(latitude) <= 90
        && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

function reportMapList(reports) {
    const list = document.createElement('ul');
    list.className = 'map-report-list';
    for (const report of reports) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'report-link';
        link.href = '#/reports/' + report.id;
        link.textContent = '#' + report.id + ' ' + report.title;
        const info = document.createElement('small');
        info.textContent = [report.status, report.address].filter(Boolean).join(' · ');
        item.append(link, info);
        list.append(item);
    }
    return list;
}

let dashboardMap;
let dashboardMarkers;
let plottedReports;

function renderAdminMap(reports) {
    if (!dashboardMap) {
        dashboardMap = createReportMap(document.querySelector('#admin-map'), document.querySelector('#admin-map-error'));
        dashboardMarkers = L.featureGroup().addTo(dashboardMap);
    }
    dashboardMap.invalidateSize({pan: false});
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
        const options = {title, alt: title};
        if (group.length > 1) {
            options.icon = L.divIcon({className: 'report-count-pin', html: String(group.length), iconSize: [34, 34]});
        }
        const marker = L.marker([first.latitude, first.longitude], options);
        marker.on('add', () => marker.getElement().setAttribute('aria-label', title));
        marker.addTo(dashboardMarkers);
        marker.bindPopup(() => reportMapList(group), {maxHeight: 180, maxWidth: 270});
    }

    const bounds = dashboardMarkers.getBounds();
    if (!bounds.isValid()) dashboardMap.setView(krakowCenter, 13);
    else if (!oldBounds.isValid() || !oldBounds.equals(bounds)) {
        dashboardMap.fitBounds(bounds, {padding: [32, 42], maxZoom: 16, animate: false});
    }
    const mapped = reports.length - unmapped.length;
    document.querySelector('#admin-map-summary').textContent = reports.length
        ? 'Na mapie ' + mapped + ' z ' + reports.length + ' zgłoszeń.'
        : 'Brak zgłoszeń.';
    const missing = document.querySelector('#admin-map-missing');
    missing.hidden = !unmapped.length;
    missing.querySelector('summary').textContent = 'Zgłoszenia bez położenia na mapie (' + unmapped.length + ')';
    missing.querySelector('div').replaceChildren(reportMapList(unmapped));
}
