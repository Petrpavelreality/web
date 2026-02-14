# Tracking audit – index & prodej_bytu_1kk_praha

## Co je implementováno
- **CAPI (/.netlify/functions/capi)** se volá při načtení stránky na `index.html` i `prodej_bytu_1kk_praha.html`. Skript vytváří `_fbc` cookie z `fbclid`, načítá `_fbc`/`_fbp` a odesílá `PageView` s `event_id` a URL. Pokud je k dispozici `fbq`, použije stejný `event_id` i pro `fbq('track', 'PageView')` pro deduplikaci. 
- **Cookie manager** po schválení marketingových cookies injektuje Meta Pixel (`fbevents.js`) a posílá paralelní `PageView` také na `/.netlify/functions/fb-capi` se stejným `event_id`, `_fbp` a `_fbc`. Současně volá `fbq('track', 'PageView', {eventID})` a nabízí helper `trackEvent` pro další události (CTA kliky, telefonní odkazy, formulář). 

## Výsledek kontroly
- Na **index.html**: CAPI request se odesílá vždy při načtení; při existenci `fbq` dojde k volání `fbq('track', 'PageView', {eventID})`. Po přijetí marketingových cookies se pixel i `fb-capi` automaticky načtou a deduplikují přes stejné `event_id` a `_fbp`/`_fbc`. 
- Na **prodej_bytu_1kk_praha.html**: Stejný postup jako na hlavní stránce – před načtením pixelu se ukládá `_fbc`, odesílá se CAPI `PageView` a pixel + `fb-capi` se načtou po udělení marketingového souhlasu. CTA, tel: a formulářové odeslání využívají `trackEvent`/`fbq('track')`. 

## Doporučení
- Pokud chcete vyloučit CAPI request před udělením souhlasu, můžete obalit úvodní CAPI skript kontrolou `cookieConsent.marketing` / `cookieConsent.analytics`. Jinak je aktuální nastavení kompatibilní s deduplikací Meta (sdílí `event_id`, `_fbp`, `_fbc`).
