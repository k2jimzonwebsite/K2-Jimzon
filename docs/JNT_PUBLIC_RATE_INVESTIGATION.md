# J&T Philippines Public Rate Calculator Investigation

**Investigation date:** 2026-09-01 (Asia/Manila)  
**Public page:** [J&T Express Shipping Rates](https://www.jtexpress.ph/shipping-rates)  
**Scope:** Research and analysis only. No K2Jimzon checkout, shipping, database, provider, or production configuration was changed.  
**Related existing idea record:** `IDEA-20260901-01`  
**Bottom-line classification:** **SAFE ONLY FOR RATE-DATA COLLECTION**

## Executive finding

The public calculator is a JavaScript application that calls an undocumented, versionless J&T website API at `https://ylofficialjw.jtexpress.ph`. It publicly exposes:

- a two-level province-to-city hierarchy;
- three service codes (`EZ`, `SP`, and `RR`);
- a rate calculation operation accepting city names, weight, dimensions, declared value, and pouch selection.

The three relevant operations worked from a fresh HTTP client without loading the webpage, without an authenticated account, and without supplying a cookie, `Authorization` header, or CSRF token. The first successful responses nevertheless set a cookie; its name and value were deliberately not inspected or retained. An `OPTIONS` preflight reflected both J&T's origin and an unrelated test origin, so CORS was permissive when observed.

This proves technical accessibility on the investigation date. It does **not** make the endpoints an official or stable API. No public API contract, versioning promise, service-level agreement, reuse permission, or change-notification mechanism was found on the official pages reviewed. The location data also contains stale and non-geographic records, the rate request uses mutable city names instead of IDs, numeric IDs/codes are rejected with an empty result, application failures still use HTTP 200, and `RR` returned a successful zero-fee result with no availability explanation.

K2Jimzon should therefore not call this endpoint in the live checkout path. A bounded, reviewed collection job may use it as one input to a versioned rate-data snapshot, subject to J&T's permission and operational review. Runtime checkout should use K2-owned, versioned rates sourced or approved by J&T, then reconcile the estimate against the actual booked courier charge.

## Method and safety boundaries

The investigation used visible Chrome with Playwright network listeners, DOM interaction with the public calculator, the loaded public JavaScript bundle, and fresh Playwright HTTP request contexts. Requests were paced and bounded. Only publicly invoked website endpoints were exercised.

The investigation did not:

- sign in or access a customer/VIP account;
- probe booking, order, waybill, private, or VIP operations;
- defeat authentication, WAF controls, CAPTCHA, or rate limits;
- enumerate protected data;
- retain cookies, session identifiers, authorization values, analytics identifiers, or other secrets;
- perform a load or stress test.

The page also sent unrelated analytics traffic to `https://snssdk.jtexpress.ph/list`. That request was not a location/rate endpoint. Its analytics/session identifiers were excluded from this report and were not retained.

## Page-to-API flow

```text
Open /shipping-rates
  -> GET province rows
  -> select a province
       -> GET city rows using numeric province parentId
  -> GET public service choices
  -> submit city names + parcel inputs
       -> POST findRates
       -> render fee rows returned by the API
```

The province and city IDs/codes drive the dropdown hierarchy. The final rate request does **not** send those IDs/codes or either province name; it sends only the selected origin and destination city `nativeName` strings.

## Discovered endpoints

| Purpose | Method | Full URL/pattern | Called by calculator | Fresh request without page/auth succeeded |
|---|---:|---|---:|---:|
| Province list | `GET` | `https://ylofficialjw.jtexpress.ph/website/base/info/area?countryCode=PH&current=1&size=9999` | Yes | Yes |
| Cities under province | `GET` | `https://ylofficialjw.jtexpress.ph/website/base/info/area?countryCode=PH&parentId={provinceId}&current=1&size=9999` | Yes | Yes |
| Service types | `GET` | `https://ylofficialjw.jtexpress.ph/website/base/info/getExpressTypes` | Yes | Yes |
| Rate calculation | `POST` | `https://ylofficialjw.jtexpress.ph/website/fee/findRates` | Yes | Yes |

No separate public tariff, zone, fee-table, or service-availability operation was called by this page. The loaded bundles contained strings associated with other order/cost operations, but the public rate page did not call them and they were not probed.

### Relevant non-sensitive headers

Normal browser requests included:

```http
Accept: application/json, text/plain, */*
Content-Type: application/json
Origin: https://www.jtexpress.ph
Referer: https://www.jtexpress.ph/
```

No `Authorization` or CSRF header was present. Relevant response headers included:

```http
Content-Type: application/json;charset=UTF-8
Access-Control-Allow-Credentials: true
Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers
Server: Tengine
```

The normal page request allowed the J&T website origin. Explicit preflight tests returned HTTP 200 and reflected both `https://www.jtexpress.ph` and the unrelated test origin `https://example.invalid`, with `Access-Control-Allow-Credentials: true` and `content-type` allowed. CORS behavior is mutable server policy and must not be treated as permission or a compatibility guarantee.

## Endpoint details

### 1. Province list

**Request**

```http
GET https://ylofficialjw.jtexpress.ph/website/base/info/area?countryCode=PH&current=1&size=9999
```

**Query parameters**

| Field | Observed value | Meaning |
|---|---|---|
| `countryCode` | `PH` | Country selector |
| `current` | `1` | Requested page |
| `size` | `9999` | Requested page size; response reported `size: 500` |

**Sanitized example response**

```json
{
  "code": 1,
  "msg": "请求成功",
  "data": {
    "records": [
      {
        "id": 55654,
        "code": "820000",
        "nativeName": "BULACAN",
        "type": 2
      },
      {
        "id": 55664,
        "code": "920000",
        "nativeName": "METRO-MANILA",
        "type": 2
      }
    ],
    "total": 84,
    "size": 500,
    "current": 1,
    "pages": 1
  },
  "succ": true,
  "fail": false
}
```

The example array is shortened; 84 type-2 rows were returned.

### 2. City list for a province

**Request example**

```http
GET https://ylofficialjw.jtexpress.ph/website/base/info/area?countryCode=PH&parentId=55654&current=1&size=9999
```

`parentId=55654` is the numeric ID for `BULACAN`. The child response uses the same envelope and row fields, with `type: 3`.

**Sanitized example record**

```json
{
  "id": 57126,
  "code": "820003",
  "nativeName": "SAN-JOSE-DEL-MONTE-CITY",
  "type": 3
}
```

The parent relationship is implied by the request; it is not repeated in each child row.

### 3. Service types

**Request**

```http
GET https://ylofficialjw.jtexpress.ph/website/base/info/getExpressTypes
```

**Observed response data**

```json
[
  {
    "id": 52,
    "name": "EZ",
    "enName": "EZ",
    "code": "EZ",
    "estimatedTime": null,
    "serviceFee": null
  },
  {
    "id": 31,
    "name": "J&T Super",
    "enName": "J&T Super",
    "code": "SP",
    "estimatedTime": null,
    "serviceFee": null
  },
  {
    "id": 30,
    "name": "RR",
    "enName": "RR",
    "code": "RR",
    "estimatedTime": null,
    "serviceFee": null
  }
]
```

The service-list response does not publish delivery lead time or the actual fee. `SP` pricing returned a separate per-quote service fee. The official [J&T Super page](https://www.jtexpress.ph/serviceBusiness) describes it as a premium service and states the 5 kg limit for relevant air routes. The public page did not explain `RR`, and its tested quotes returned zero; K2 must not infer that `RR` means free delivery.

### 4. Rate calculation

**Request**

```http
POST https://ylofficialjw.jtexpress.ph/website/fee/findRates
Content-Type: application/json
```

**Exact browser payload for the baseline test**

```json
{
  "country": "PH",
  "senderAddr": "SAN-JOSE-DEL-MONTE-CITY",
  "receiverAddr": "CALOOCAN",
  "weight": "1",
  "goodType": "PARCEL",
  "productType": "EZ",
  "goodsValue": "",
  "dimensionW": "",
  "dimensionH": "",
  "dimensionL": "",
  "pouchSize": ""
}
```

**Payload fields**

| Field | Format/observed values | Role |
|---|---|---|
| `country` | `PH` | Fixed country |
| `senderAddr` | City `nativeName` | Origin city; despite the field name, no full address is sent |
| `receiverAddr` | City `nativeName` | Destination city |
| `weight` | Decimal string in kg | Actual parcel weight |
| `goodType` | `PARCEL` | Fixed by this calculator |
| `productType` | `EZ`, `SP`, `RR` | Service code |
| `goodsValue` | Empty string or PHP value string | Declared value; produces an `insured` fee row |
| `dimensionL` | Empty string or cm string | Length |
| `dimensionW` | Empty string or cm string | Width |
| `dimensionH` | Empty string or cm string | Height |
| `pouchSize` | Empty, `3`, `2`, or `1` | No pouch, Small, Medium, or Big respectively |

**Baseline response**

```json
{
  "code": 1,
  "msg": "请求成功",
  "data": [
    {
      "fees": "165",
      "type": "fee",
      "goodType": "PARCEL",
      "feeWeight": null,
      "serviceFee": "0"
    }
  ],
  "succ": true,
  "fail": false
}
```

Amounts are strings and have no explicit currency property. The Philippines page labels them as PHP. The fee row did not report the charged weight (`feeWeight` was `null`).

**Application-error example**

An `SP` request at 5.01 kg returned HTTP 200 but this application envelope:

```json
{
  "code": 910000007,
  "data": null,
  "succ": false,
  "fail": true
}
```

The message states that J&T Super actual or volumetric weight cannot exceed 5 kg. A client must validate both HTTP status and the application envelope; HTTP 200 alone does not mean that a usable quote exists.

## Authentication, session, CSRF, and independent access

| Question | Observed answer |
|---|---|
| Account authentication required? | No. All three operations succeeded without sign-in or `Authorization`. |
| Existing page session required? | No. Each operation succeeded as the first request in a fresh Playwright HTTP context. |
| Cookie required on the first request? | No cookie was supplied and the request succeeded. |
| Does the server set a cookie? | Yes, a `Set-Cookie` header was present. Its name and value were neither inspected nor retained. |
| CSRF token/header required? | No CSRF token/header was sent. The POST succeeded. No CSRF validation was observed. |
| Works independently of webpage JavaScript? | Yes, on the investigation date. |
| Browser cross-origin preflight allowed? | Yes in the bounded test; the server reflected an unrelated origin. This can change at any time. |
| Official, supported public API? | Not established. It is under a `/website/` namespace and no official public API contract was located. |

## Location hierarchy and identifiers

### Extracted structure

The complete public hierarchy was traversed in memory on 2026-09-01:

- 84 type-2 province/top-level rows;
- 1,658 type-3 city/municipality rows;
- 85 successful HTTP requests for the complete traversal (one top-level request plus 84 child requests);
- zero failed child requests;
- canonical snapshot SHA-256: `c05118a91f46a3b5f458b74bfa72123984f8baceb7e5c8c368ea97e93ef66e93`.

No raw cookie/session data was included in the snapshot hash. A separate generated hierarchy artifact was intentionally not added to the repository because this task requested an analysis report, not an integration or a new canonical location source.

### Selected exact hierarchy

| Province | Province ID | Province code | City | City ID | City code |
|---|---:|---:|---|---:|---:|
| BULACAN | 55654 | `820000` | SAN-JOSE-DEL-MONTE-CITY | 57126 | `820003` |
| METRO-MANILA | 55664 | `920000` | CALOOCAN | 57317 | `920004` |
| METRO-MANILA | 55664 | `920000` | NORTH-CALOOCAN | 57318 | `920018` |
| CEBU | 55587 | `150000` | CEBU-CITY | 55782 | `150008` |
| DAVAO-DEL-SUR | 55624 | `520000` | DAVAO-CITY | 56544 | `520001` |
| LAGUNA | 55648 | `760000` | CALAMBA-CITY | 57006 | `760010` |
| CAVITE | 55643 | `710000` | BACOOR | 56919 | `710012` |
| PAMPANGA | 55599 | `270000` | ANGELES-CITY | 56061 | `270004` |
| PANGASINAN | 55600 | `280000` | DAGUPAN-CITY | 56100 | `280007` |
| BENGUET | 55595 | `230000` | BAGUIO-CITY | 55971 | `230005` |
| NUEVA-ECIJA | 55659 | `870000` | CABANATUAN-CITY | 57219 | `870008` |
| RIZAL | 55651 | `790000` | ANTIPOLO-CITY | 57080 | `790008` |

The rate operation requires the city names shown above. Substituting numeric IDs (`57126`/`57317`) or area codes (`820003`/`920004`) returned `code: 1`, `succ: true`, but an empty `data` array. That is a particularly dangerous failure mode because it looks superficially successful.

### Data-quality findings

- `COMPOSTELA-VALLEY` exists as a top-level row but has zero children, while `DAVAO-DE-ORO` has 11. This appears to be a stale alias/migration artifact.
- `LAZADA OFFICE` is a type-2 top-level row with two children. It is not a normal geographic province and must not be accepted blindly into a customer address list.
- `PANDAN` appears under both `ANTIQUE` and `CATANDUANES`.
- `TAGUIG` appears under both `METRO-MANILA` and `LAZADA OFFICE`.
- The rate payload omits province context even though city names are not globally unique.
- `CALOOCAN` and `NORTH-CALOOCAN` are separate J&T city rows and must not be normalized into one value without an explicit business decision.

These findings mean a K2 location snapshot should retain J&T province ID, province code, city ID, city code, and exact J&T names, plus a separate K2 display label and active/review status. It should never treat this endpoint as an authoritative Philippine administrative-geography source.

<details>
<summary>Complete extracted top-level layer (84 rows)</summary>

| ID | Code | J&T top-level name | Child rows |
|---:|---:|---|---:|
| 55593 | `210000` | ABRA | 27 |
| 55603 | `310000` | AGUSAN-DEL-NORTE | 12 |
| 55604 | `320000` | AGUSAN-DEL-SUR | 14 |
| 55583 | `110000` | AKLAN | 17 |
| 55630 | `580000` | ALBAY | 18 |
| 55584 | `120000` | ANTIQUE | 18 |
| 55652 | `800000` | APAYAO | 7 |
| 55662 | `900000` | AURORA | 8 |
| 55605 | `330000` | BASILAN | 14 |
| 55594 | `220000` | BATAAN | 12 |
| 55653 | `810000` | BATANES | 6 |
| 55642 | `700000` | BATANGAS | 34 |
| 55595 | `230000` | BENGUET | 14 |
| 55636 | `640000` | BILIRAN | 8 |
| 55585 | `130000` | BOHOL | 48 |
| 55606 | `340000` | BUKIDNON | 22 |
| 55654 | `820000` | BULACAN | 24 |
| 55655 | `830000` | CAGAYAN | 29 |
| 55631 | `590000` | CAMARINES-NORTE | 12 |
| 55632 | `600000` | CAMARINES-SUR | 37 |
| 55607 | `350000` | CAMIGUIN | 5 |
| 55586 | `140000` | CAPIZ | 17 |
| 55633 | `610000` | CATANDUANES | 12 |
| 55643 | `710000` | CAVITE | 23 |
| 55587 | `150000` | CEBU | 53 |
| 55622 | `500000` | COMPOSTELA-VALLEY | 0 |
| 55608 | `360000` | COTABATO | 19 |
| 102016 | `950000` | DAVAO-DE-ORO | 11 |
| 55623 | `510000` | DAVAO-DEL-NORTE | 11 |
| 55624 | `520000` | DAVAO-DEL-SUR | 12 |
| 101949 | `940000` | DAVAO-OCCIDENTAL | 5 |
| 55625 | `530000` | DAVAO-ORIENTAL | 11 |
| 55621 | `490000` | DINAGAT-ISLANDS | 7 |
| 55637 | `650000` | EASTERN-SAMAR | 24 |
| 55588 | `160000` | GUIMARAS | 5 |
| 55656 | `840000` | IFUGAO | 11 |
| 55596 | `240000` | ILOCOS-NORTE | 23 |
| 55597 | `250000` | ILOCOS-SUR | 34 |
| 55589 | `170000` | ILOILO | 44 |
| 55657 | `850000` | ISABELA | 37 |
| 55663 | `910000` | KALINGA | 8 |
| 55598 | `260000` | LA-UNION | 20 |
| 55648 | `760000` | LAGUNA | 30 |
| 55609 | `370000` | LANAO-DEL-NORTE | 23 |
| 55610 | `380000` | LANAO-DEL-SUR | 40 |
| 55665 | `930000` | LAZADA OFFICE | 2 |
| 55639 | `670000` | LEYTE | 43 |
| 55611 | `390000` | MAGUINDANAO | 36 |
| 55649 | `770000` | MARINDUQUE | 6 |
| 55634 | `620000` | MASBATE | 21 |
| 55664 | `920000` | METRO-MANILA | 34 |
| 55612 | `400000` | MISAMIS-OCCIDENTAL | 17 |
| 55613 | `410000` | MISAMIS-ORIENTAL | 26 |
| 55658 | `860000` | MOUNTAIN-PROVINCE | 10 |
| 55590 | `180000` | NEGROS-OCCIDENTAL | 32 |
| 55591 | `190000` | NEGROS-ORIENTAL | 25 |
| 55640 | `680000` | NORTHERN-SAMAR | 24 |
| 55659 | `870000` | NUEVA-ECIJA | 32 |
| 55660 | `880000` | NUEVA-VIZCAYA | 15 |
| 55644 | `720000` | OCCIDENTAL-MINDORO | 11 |
| 55645 | `730000` | ORIENTAL-MINDORO | 15 |
| 55647 | `750000` | PALAWAN | 24 |
| 55599 | `270000` | PAMPANGA | 22 |
| 55600 | `280000` | PANGASINAN | 48 |
| 55650 | `780000` | QUEZON | 41 |
| 55661 | `890000` | QUIRINO | 6 |
| 55651 | `790000` | RIZAL | 14 |
| 55646 | `740000` | ROMBLON | 17 |
| 55627 | `550000` | SARANGANI | 7 |
| 55592 | `200000` | SIQUIJOR | 6 |
| 55635 | `630000` | SORSOGON | 15 |
| 55628 | `560000` | SOUTH-COTABATO | 12 |
| 55638 | `660000` | SOUTHERN-LEYTE | 20 |
| 55629 | `570000` | SULTAN-KUDARAT | 12 |
| 55614 | `420000` | SULU | 19 |
| 55615 | `430000` | SURIGAO-DEL-NORTE | 21 |
| 55616 | `440000` | SURIGAO-DEL-SUR | 19 |
| 55601 | `290000` | TARLAC | 18 |
| 55617 | `450000` | TAWI-TAWI | 11 |
| 55641 | `690000` | WESTERN-SAMAR | 26 |
| 55602 | `300000` | ZAMBALES | 14 |
| 55618 | `460000` | ZAMBOANGA-DEL-NORTE | 27 |
| 55619 | `470000` | ZAMBOANGA-DEL-SUR | 28 |
| 55620 | `480000` | ZAMBOANGA-SIBUGAY | 16 |

</details>

## Controlled rate results

Unless stated otherwise, all tests used:

- origin province: `BULACAN`;
- origin city: `SAN-JOSE-DEL-MONTE-CITY`;
- `goodType: PARCEL`;
- service: `EZ`;
- no pouch;
- no declared value;
- no dimensions.

These are observations of the public retail calculator on one date, not promised J&T contract/VIP rates.

### Required 1/2/3 kg destination tests

| Origin | Destination | Weight | Dimensions | Service | Shipping fee | Service fee | Additional/insured fee | Total |
|---|---|---:|---|---|---:|---:|---:|---:|
| SAN-JOSE-DEL-MONTE-CITY | CALOOCAN | 1 kg | none | EZ | PHP 165 | PHP 0 | PHP 0 | **PHP 165** |
| SAN-JOSE-DEL-MONTE-CITY | CALOOCAN | 2 kg | none | EZ | PHP 190 | PHP 0 | PHP 0 | **PHP 190** |
| SAN-JOSE-DEL-MONTE-CITY | CALOOCAN | 3 kg | none | EZ | PHP 190 | PHP 0 | PHP 0 | **PHP 190** |
| SAN-JOSE-DEL-MONTE-CITY | CEBU-CITY | 1 kg | none | EZ | PHP 180 | PHP 0 | PHP 0 | **PHP 180** |
| SAN-JOSE-DEL-MONTE-CITY | CEBU-CITY | 2 kg | none | EZ | PHP 200 | PHP 0 | PHP 0 | **PHP 200** |
| SAN-JOSE-DEL-MONTE-CITY | CEBU-CITY | 3 kg | none | EZ | PHP 200 | PHP 0 | PHP 0 | **PHP 200** |
| SAN-JOSE-DEL-MONTE-CITY | DAVAO-CITY | 1 kg | none | EZ | PHP 195 | PHP 0 | PHP 0 | **PHP 195** |
| SAN-JOSE-DEL-MONTE-CITY | DAVAO-CITY | 2 kg | none | EZ | PHP 220 | PHP 0 | PHP 0 | **PHP 220** |
| SAN-JOSE-DEL-MONTE-CITY | DAVAO-CITY | 3 kg | none | EZ | PHP 220 | PHP 0 | PHP 0 | **PHP 220** |

### Additional Luzon samples

| Origin | Destination | 1 kg total | 3 kg total |
|---|---|---:|---:|
| SAN-JOSE-DEL-MONTE-CITY | CALAMBA-CITY | PHP 155 | PHP 180 |
| SAN-JOSE-DEL-MONTE-CITY | BACOOR | PHP 155 | PHP 180 |
| SAN-JOSE-DEL-MONTE-CITY | ANGELES-CITY | PHP 155 | PHP 180 |
| SAN-JOSE-DEL-MONTE-CITY | DAGUPAN-CITY | PHP 155 | PHP 180 |
| SAN-JOSE-DEL-MONTE-CITY | BAGUIO-CITY | PHP 155 | PHP 180 |

These equal totals do not prove that the cities share a stable published zone. The endpoint does not expose a zone/tariff identifier.

### Weight-band observations

For the fixed origin to `CALOOCAN`, EZ, no dimensions/pouch/value:

| Tested actual weight(s) | Returned shipping fee |
|---|---:|
| 0.10, 0.50 kg | PHP 95 |
| 0.99, 1.00 kg | PHP 165 |
| 1.01, 1.49, 1.50, 1.99, 2.00, 2.01, 2.50, 2.99, 3.00 kg | PHP 190 |
| 3.01, 3.50, 4.00 kg | PHP 210 |
| 4.50, 5.00 kg | PHP 220 |
| 10.00 kg | PHP 415 |

Only the listed points were tested. The data demonstrates step/band pricing; it does not establish every exact boundary between untested points.

### Dimensional pricing

The loaded public bundle computes displayed volumetric weight as:

```text
volumetric kg = (length cm × width cm × height cm) / 3500
```

It rounds that display to two decimal places. The page rule and J&T's official [Terms and Conditions](https://www.jtexpress.ph/termsAndConditions) say billing uses actual or dimensional weight, whichever is greater. The observed endpoint results match that rule.

| Destination | Actual weight | L×W×H | Calculated volumetric weight | Greater test weight | Shipping fee |
|---|---:|---:|---:|---:|---:|
| CALOOCAN | 1 kg | none | n/a | 1 kg | PHP 165 |
| CALOOCAN | 1 kg | 10×10×10 cm | 0.29 kg | 1 kg | PHP 165 |
| CALOOCAN | 1 kg | 20×20×20 cm | 2.29 kg | 2.29 kg | PHP 190 |
| CALOOCAN | 1 kg | 35×25×20 cm | 5.00 kg | 5 kg | PHP 220 |
| CALOOCAN | 1 kg | 50×40×30 cm | 17.14 kg | 17.14 kg | PHP 735 |
| CALOOCAN | 1 kg | 80×50×40 cm | 45.71 kg | 45.71 kg | PHP 1,855 |
| CEBU-CITY | 1 kg | 35×25×20 cm | 5.00 kg | 5 kg | PHP 320 |
| CEBU-CITY | 5 kg | none | n/a | 5 kg | PHP 320 |

The Cebu equality is a controlled confirmation that a 1 kg parcel with 5 kg volumetric weight was charged the same as a 5 kg parcel without dimensions.

### Service behavior

| Destination | Service/code | Actual weight | Base shipping fee | Service fee | Total | Interpretation |
|---|---|---:|---:|---:|---:|---|
| CALOOCAN | EZ | 1 kg | PHP 165 | PHP 0 | PHP 165 | Usable observed quote |
| CALOOCAN | J&T Super / SP | 1 kg | PHP 190 | PHP 25 | PHP 215 | Premium fee returned separately |
| CEBU-CITY | EZ | 1 kg | PHP 180 | PHP 0 | PHP 180 | Usable observed quote |
| CEBU-CITY | J&T Super / SP | 1 kg | PHP 205 | PHP 25 | PHP 230 | Premium fee returned separately |
| CALOOCAN | RR | 1 kg | PHP 0 | PHP 0 | PHP 0 | **Not safe to treat as a valid/free quote** |
| CEBU-CITY | RR | 1 kg | PHP 0 | PHP 0 | PHP 0 | **Not safe to treat as a valid/free quote** |

`SP` at exactly 5 kg returned a quote; 5.01 kg and 6 kg returned application error `910000007`. Service eligibility must therefore be validated, not inferred from `getExpressTypes` alone.

### Declared value / “Item additional fee”

The page labels the control “Item additional fee,” but the response row is explicitly `type: "insured"`. For the 1 kg EZ Caloocan baseline:

| Declared goods value | Shipping fee | Returned insured fee | Total |
|---:|---:|---:|---:|
| blank | PHP 165 | PHP 0 | PHP 165 |
| PHP 1 | PHP 165 | PHP 5 | PHP 170 |
| PHP 100 | PHP 165 | PHP 5 | PHP 170 |
| PHP 999 | PHP 165 | PHP 10 | PHP 175 |
| PHP 1,000 | PHP 165 | PHP 10 | PHP 175 |
| PHP 1,001 | PHP 165 | PHP 10 | PHP 175 |
| PHP 5,000 | PHP 165 | PHP 50 | PHP 215 |
| PHP 10,000 | PHP 165 | PHP 100 | PHP 265 |
| PHP 30,000 | PHP 165 | PHP 300 | PHP 465 |

The points are consistent with an approximately 1% insured fee, rounded to whole pesos, with an observed PHP 5 minimum. Exact rounding boundaries were not exhaustively mapped. The public UI limits declared value to PHP 30,000, consistent with the maximum non-document claim amount stated in J&T's official terms/package information.

### Pouch / bag specification behavior

Visible Chrome interaction confirmed these label-to-payload mappings and results for the 1 kg EZ Caloocan case:

| UI choice | `pouchSize` | Returned shipping fee | Additional fee | Total |
|---|---:|---:|---:|---:|
| none | empty string | PHP 165 | PHP 0 | PHP 165 |
| Small (`<=3KG`) | `3` | PHP 70 | PHP 0 | PHP 70 |
| Medium (`<=5KG`) | `2` | PHP 90 | PHP 0 | PHP 90 |
| Big (`<=8KG`) | `1` | PHP 120 | PHP 0 | PHP 120 |

The pouch selection changes the base tariff; it is not returned as a separate packaging fee. K2 must not assume that these weight labels alone establish physical pouch dimensions, inventory availability, branch acceptance, or a permanently available promotion.

## Rate and input behavior summary

- Rate lookup keys are exact J&T city names plus service/input values, not province/city IDs.
- Pricing is destination-dependent and step/band-based.
- Dimensional pricing materially changes charges and uses divisor 3,500 cm³/kg on the observed page.
- The greater of actual and dimensional weight governs the observed charge.
- `SP` adds a `serviceFee` and enforces a 5 kg actual/volumetric maximum.
- Declared value adds a separate `insured` row.
- Pouch selection switches to a separate tariff path.
- The rate response does not expose a tariff version, zone, currency code, expiry, guaranteed availability, delivery promise, or authoritative charged-weight field.
- A successful envelope can contain an empty data array or a zero fee, so positive-result validation is mandatory even for offline collection.
- The page's observed validation includes a general 50 kg maximum, 180 cm maximum per dimension, PHP 30,000 maximum declared value, and 5 kg maximum for J&T Super. These website constraints can change independently of the API.

## Rate-limit observations

No HTTP 429 response, `Retry-After`, or standard rate-limit header appeared in:

- the paced 85-request full hierarchy traversal; or
- the paced 55-request principal rate matrix.

Additional small boundary/edge checks also completed without HTTP throttling. This was deliberately **not** a stress test. Absence of a visible header does not mean there is no WAF, behavioral threshold, IP reputation rule, undisclosed quota, or future rate limit. A collection process would still need conservative pacing, backoff, a circuit breaker, caching, and an immediate stop on 403/429/CAPTCHA behavior.

## Reliability and data-integrity concerns

1. **Undocumented implementation detail.** The endpoint is for the public website, not a published partner API contract.
2. **No version or effective date.** A quote cannot be tied to a tariff revision supplied by J&T.
3. **No SLA or change notice.** Host, path, payload, CORS, cookies, WAF behavior, and schema may change without notice.
4. **Mutable name keys.** Rates require exact city strings; IDs/codes do not work in the final lookup.
5. **Ambiguous city names.** Province context is discarded before rate lookup even though duplicate city names exist.
6. **Hierarchy contamination.** Stale aliases and `LAZADA OFFICE` require quarantine/review.
7. **Weak success semantics.** HTTP 200 can carry application failure; `succ: true` can carry no rows; `RR` can carry a zero row.
8. **Missing quote metadata.** No currency field, expiry, zone, tariff version, lead time, route-availability flag, or official charged weight.
9. **Public versus K2 commercial rate.** The calculator may represent standard public/walk-in pricing, not K2's eventual VIP/contract rate, pickup fee, branch rule, or promotion.
10. **Combinatorial collection cost.** 1,658 destinations multiplied by origins, weight bands, dimensions, services, pouches, and declared values is not a reasonable exhaustive scrape. The API does not expose the underlying zone table.
11. **Operational truth differs from an estimate.** Final courier acceptance, measured dimensions/weight, packaging, declared value, route availability, and branch handling can change the actual charge. J&T's [package information](https://www.jtexpress.ph/information/packages-information) likewise states that the higher actual/dimensional weight is used and packaging can affect billed weight.

## Architecture options for K2Jimzon

| Option | Technically possible today? | Production recommendation | Reason |
|---|---:|---|---|
| **A. K2 backend calls public `findRates` during checkout** | Yes | **Do not use** | Undocumented, no SLA/version, mutable name keys, ambiguous/zero/empty successes, public rates may not be K2 rates, and checkout would inherit J&T website outages/WAF changes. |
| **B. Periodically retrieve public rate information into a local table** | Partly | **Acceptable only as bounded, reviewed rate-data collection** | Removes live checkout dependency and permits validation/versioning, but exhaustive inference is impractical and collection/reuse should be approved by J&T. |
| **C. Use J&T as a reference and maintain K2 rates** | Yes | **Recommended runtime architecture** | K2 can version, audit, test, and roll back its estimate logic; staff can reconcile it to actual courier charges while K2 pursues an official J&T schedule/API. |

### Recommended K2 operating model

1. Obtain written confirmation from J&T about K2's applicable public/VIP rate schedule, service eligibility, insurance, pouch rules, remote-area/other fees, rate limits, and official API availability.
2. Maintain a K2-owned, effective-dated rate version with exact source/provenance and approval state.
3. Use the public endpoint only in a bounded offline evidence collector or staff verification tool, never as the synchronous checkout dependency.
4. Quarantine unexpected hierarchy additions, renamed locations, duplicate names, empty rate results, zero rates, schema changes, or material quote deltas for human review.
5. Store the rate version and inputs used for every K2 estimate. Label checkout shipping as an estimate until the operational workflow reaches the point where the actual courier charge is known.
6. Record and reconcile actual booked weight, dimensional weight, courier service, service/insured/other fees, and final charge in the Admin BOS.
7. Keep the existing manual/unavailable path for routes or services without an approved, testable rate.
8. Replace the public reference collector with an official J&T partner/VIP API or signed rate sheet when available.

The public endpoint should not receive customer PII from K2. It only needs normalized city names and parcel characteristics for rate reference; even those requests should be made by an offline collector with no customer/session linkage.

## What would break if J&T changes the website

- A new API hostname, route prefix, method, or payload field would break the caller.
- Renamed city strings would make existing stored selections return empty data even if numeric IDs/codes remain unchanged.
- Changed province parent IDs would break hierarchy traversal/caching.
- A different response envelope or amount type would break parsing and totals.
- A change to the dimensional divisor, rounding, weight bands, pouch mapping, insured-fee rule, or service code would make locally inferred behavior wrong.
- Authentication, signed requests, CSRF, CAPTCHA, WAF, cookie enforcement, CORS restriction, or new quotas would stop access.
- Removal of `RR`, addition of services, or changed eligibility would invalidate hard-coded service assumptions.
- A zero/empty-result behavior change could silently turn errors into displayed free shipping unless guarded.
- A bundle-only UI validation change could diverge from server validation.
- Retail promotions or tariff updates could change quoted amounts without a version/effective-date signal.

For an offline collector, these events should fail closed, preserve the last approved K2 rate version, alert staff, and require review. For a live checkout dependency, the same events would create customer-facing outages or incorrect charges; that is why Option A is not advisable.

## Production recommendation

The endpoint is technically callable but is not a dependable production integration surface. Use it only for conservative, permission-aware, offline collection and comparison. Do not use it as the checkout source of truth, a silent runtime fallback, or evidence that a shipment has been accepted/booked by J&T.

K2Jimzon should run checkout from an owner-approved, versioned local rate model and reconcile to the actual J&T booking. An official J&T partner/VIP API or signed rate schedule should supersede this public website research.

## Official sources reviewed

- [J&T Express Shipping Rates](https://www.jtexpress.ph/shipping-rates)
- [J&T Express Terms and Conditions](https://www.jtexpress.ph/termsAndConditions)
- [J&T Express Package Information](https://www.jtexpress.ph/information/packages-information)
- [J&T Super service information](https://www.jtexpress.ph/serviceBusiness)

## Final classification

# SAFE ONLY FOR RATE-DATA COLLECTION
