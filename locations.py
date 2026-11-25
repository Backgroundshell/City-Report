import json
import os
from http.client import HTTPException
from urllib.parse import urlencode
from urllib.request import Request, urlopen


PHOTON_URL = os.getenv("CITYREPORT_PHOTON_URL", "https://photon.komoot.io").rstrip("/")


def coordinates(latitude, longitude):
    try:
        if isinstance(latitude, bool) or isinstance(longitude, bool):
            raise ValueError
        lat, lon = float(latitude), float(longitude)
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            return lat, lon
    except (TypeError, ValueError, OverflowError):
        pass
    raise ValueError("Nieprawidłowe położenie punktu na mapie.")


def lookup_location(data, *, reverse):
    lat, lon = coordinates(data.get("latitude"), data.get("longitude"))
    params = {"lat": lat, "lon": lon}
    if reverse:
        endpoint = "reverse"
        params.update(limit=5, radius=0.25, layer=["house", "street"])
    else:
        endpoint = "api"
        query = data.get("query")
        if not isinstance(query, str) or not 1 <= len(query.strip()) <= 250:
            raise ValueError("Wpisz adres o długości do 250 znaków.")
        params.update(q=query.strip(), limit=5)

    request = Request(f"{PHOTON_URL}/{endpoint}?{urlencode(params, doseq=True)}", headers={
        "User-Agent": "CityReport/1.0 (municipal issue reporting)",
        "Accept": "application/json", "Accept-Language": "pl",
    })
    try:
        with urlopen(request, timeout=6) as response:
            features = json.load(response)["features"]
        places = []
        for feature in features:
            lon, lat = feature["geometry"]["coordinates"]
            lat, lon = coordinates(lat, lon)
            props = feature["properties"]
            town = props.get("city") or props.get("locality") or props.get("district")
            street_name = props.get("street")
            if reverse and not street_name:
                if props.get("type") == "street":
                    street_name = props.get("name")
                elif props.get("housenumber"):
                    street_name = town
                if not street_name:
                    continue
            street = " ".join(filter(None, (street_name, props.get("housenumber"))))
            parts = [None if reverse else props.get("name"), street, town, props.get("country")]
            address = ", ".join(dict.fromkeys(filter(None, parts)))
            if address:
                places.append({"latitude": lat, "longitude": lon, "address": address})
                if reverse:
                    break
        return places
    except (OSError, HTTPException, KeyError, TypeError, ValueError) as error:
        raise RuntimeError("Wyszukiwanie adresów jest chwilowo niedostępne.") from error
