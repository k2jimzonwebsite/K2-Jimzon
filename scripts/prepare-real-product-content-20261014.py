"""Offline owner-content preparation. Never imports or publishes canonical data."""
import csv, hashlib, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '.tools/map018-hosted-draft-import-20261013-01/owner-source-partial-drafts.csv'
OUT = ROOT / 'outputs/01a1395d-4c7c-77b2-9fe8-1760963e7e0c/product-content'
OUT.mkdir(parents=True, exist_ok=True)
rows = list(csv.DictReader(SOURCE.open(encoding='utf-8-sig')))

# Only the small stated description/usage claims below come from these references.
# Ingredient, allergy, origin, compatibility and net-content fields await held labels.
refs = {
 'baiocchi': 'https://www.mulinobianco.it/baiocchi-pistacchio',
 'barilla': 'https://www.barilla.com/it-it/prodotti/sughi/ragu/ragu-alla-bolognese',
 'nutella': 'https://www.nutella.com/it/it/prodotti/nutella-biscuits',
 'tortina': 'https://www.loacker.com/int/en/products/exquisite-patisserie/tortina-white',
 'blueberry': 'https://www.loacker.com/int/en/products/world-of-wafers/quadratini-blueberry-yogurt',
 'raspberry': 'https://www.loacker.com//int/en/products/world-of-wafers/quadratini-raspberry-yogurt',
 'tigullio': 'https://tigullio-star.it/pesti-speciali/',
 'cremoso': 'https://www.tigullio-star.it/granpesto-cremoso/',
 'genovese': 'https://tigullio-star.it/pesto-alla-genovese/',
 'lavazza': 'https://www.lavazza.it/it/caffe-tostato-macinato',
 'oro': 'https://www.lavazza.it/it/caffe-tostato-macinato/qualita-oro-sinfonia-perfetta.1219',
 'rio': 'https://www.riomare.it/prodotti/tonno-olio-di-oliva/tonno-allolio-di-oliva/',
 'nostromo': 'https://tonnonostromo.it/prodotti/tonno-all-olio-di-oliva/',
 'galatine': 'https://galatine.it/tavolette-al-latte/',
 'baresa': 'https://www.lidl.it/p/baresa-pesto/p10050002',
 'gimoka': 'https://b2b.gimoka.com/prodotto/10-tubi-con-10-capsule-tubo-forte-x10-gimoka-capsule-compatibili-con-sistema-nespresso/',
 'poppies': 'https://www.poppiesbakeries.com/sites/default/files/ckeditor-files/RETAIL%20CATALOOG%2010-2025%20-%20LRES_0.pdf',
}

def title(name):
    s = re.sub(r'\([^)]*\)', '', name)
    s = re.sub(r'\bDISPLAY\b.*|\bBATCH\b.*|\bNEW PACKAGING\b', '', s, flags=re.I)
    replacements = {'TIGULIO':'TIGULLIO', 'RADDICHIO':'RADICCHIO', 'PISTACHIO':'PISTACCHIO',
                    'CONDITIONAER':'CONDITIONER', 'CHOCCOLATE':'CHOCOLATE', 'TORTELLNI':'TORTELLINI',
                    'FUSILI':'FUSILLI', 'MACADEMIA':'MACADAMIA', 'SAVIOARDI':'SAVOIARDI',
                    'FIN CARRE':'FIN CARRÉ', 'MARE BLU':'MAREBLU', 'MC KENNEDY':'MCKENNEDY',
                    'CAFF�':'CAFFÈ', 'CR�ME':'CRÈME', 'SPAG.':'SPAGHETTI', 'SPAG ':'SPAGHETTI ',
                    'W/O GARLIC':'WITHOUT GARLIC', 'W/OLIVE OIL':'WITH OLIVE OIL',
                    'XTRA VIRGIN':'EXTRA VIRGIN', 'BY 2s':'2-PACK', 'BY 2':'2-PACK'}
    for a,b in replacements.items():
        s = re.sub(re.escape(a), lambda _: b, s, flags=re.I)
    s = re.sub(r'\b(\d+)\s*(?:X|BY)\s*(\d+)\s*(G|ML)\b', r'\1 x \2 \3', s, flags=re.I)
    s = re.sub(r'(\d)\s*(KG|G|ML)\b', r'\1 \2', s, flags=re.I)
    s = re.sub(r'\s+', ' ', s).strip().title()
    s = re.sub(r'(?<=\d)\s+(Ml|Kg|G)\b', lambda m: ' '+m[1].lower(), s)
    return re.sub(r'(?<=\d) X (?=\d)', ' x ', s)

def content(n, t):
    u=n.upper(); category='Unidentified'; desc=''; use=''; reference=''; note='Exact product type and manufacturer needed.'
    if 'VINO ROSSO' in u:
        category='Wine'; desc='Astratto red wine in a 750 ml bottle, listed at 10% alcohol by volume.'
        note='Confirm producer spelling, label ABV, origin and bottle volume. Alcohol sale/delivery rules require separate operational review.'
    elif any(x in u for x in ['TUNA','TONNO','RIO MARE','NOSTROMO','MARE BLU','MARUZELLA']):
        category='Tinned fish'; desc=f'{t}. A pantry option for sandwiches, salads or a pasta dish.'
        note='Confirm tuna species, oil/brine variant, can count, individual net and drained weights.'
        if 'RIO MARE' in u: reference=refs['rio']
        if 'NOSTROMO' in u: reference=refs['nostromo']
    elif any(x in u for x in ['SPAG','LINGUINE','FARFALLE','FUSILI','LASAGNE']):
        category='Pasta'; desc=f'{t} for your next pasta meal.'
        use='Follow the cooking time on the pack. Pair with your preferred sauce.'
        note='Confirm full pasta name, recipe, net weight and label cooking time. Do not infer egg-free or gluten-free.'
    elif any(x in u for x in ['PESTO','TIGULIO','TIGULLIO','LIGURE']):
        category='Pesto and sauces'; desc=f'{t} for pasta and other savoury dishes.'
        note='Confirm exact flavour, jar weight, ingredients, allergens and refrigeration after opening.'
        if 'BARESA' in u: reference=refs['baresa']
        if 'TIGUL' in u:
            reference=refs['tigullio']
            flavours={'CARCIOFI E NOCI':'artichoke and walnut','OLIVE E CAPPERI':'olive and caper',
                      'PEPERONI E NOCI':'pepper and walnut','POMODORI SECCHI PISTACHIO':'sun-dried tomato and pistachio',
                      'RADDICHIO E SPECK':'radicchio and speck','RICOTTA E NOCI':'ricotta and walnut'}
            for key, flavour in flavours.items():
                if key in u: desc=f'Tigullio {flavour} pesto. Stir it through pasta or serve a little on bread.'
            if 'CREMOSO' in u:
                reference=refs['cremoso']; desc='Tigullio Gran Pesto Cremoso is a smooth Genovese-style pesto for pasta.'
            elif 'GENOVESE' in u:
                reference=refs['genovese']; desc='Tigullio Genovese pesto for dressing pasta or adding to savoury dishes.'
            elif 'ZAFFERANO' in u or 'PLAIN' in u:
                reference=''  # The range page does not identify these vague source variants.
    elif any(x in u for x in ['RAGU','AMATRICIANA','SALSICCIA','BOTTLE 400G RICOTTA']):
        category='Pasta sauces'; desc=f'{t} to pair with pasta.'
        note='Confirm sauce recipe, jar/can format, serving directions and storage after opening.'
        if 'BARILLA' in u:
            reference=refs['barilla']; desc='Barilla Ragù alla Bolognese is a tomato-based pasta sauce with beef and pork.'
            use='Warm gently, then stir through freshly cooked pasta.'
    elif any(x in u for x in ['CARNE','PROSCIUTTO','FORMAGGI']):
        category='Filled pasta candidate'; note='Name does not establish product format or storage regime. Confirm filled-pasta identity, filling and dry/fresh/chilled classification before copy.'
        if 'TORTELLNI' in u:
            desc=f'{t}. Filled pasta to serve with your chosen sauce.'
            note='Confirm filling recipe, net weight, cooking time and dry/fresh/chilled storage regime.'
    elif any(x in u for x in ['LAVAZZA','PELLINI','SEGAFREDO','CAFFE','CAFF�','NESPRESSO','ORZO']):
        category='Coffee and drink preparations'; desc=f'{t} for your home drinks selection.'
        note='Confirm ground/beans/capsules/soluble form, exact blend, pack count and brewing system. Nespresso mentions do not prove Vertuo compatibility.'
        if 'LAVAZZA' in u:
            reference=refs['lavazza']; desc=f'{t}. Choose the brewing method shown on the pack.'
            if 'FORTE' in u: desc=f'{t}. A dark-roasted coffee blend for a fuller cup.'
            if 'ORO' in u: reference=refs['oro']
            if 'ROSSA 1KG' in u: note+=' The 1 kg source does not establish ground versus whole beans.'
            if 'DEK' in u: reference=''  # Current Decaf range is not proof of held DEK variant.
        elif 'GIMOKA' in u and 'FORTE' in u:
            reference=refs['gimoka']; desc='Gimoka Forte coffee capsules, listed in the source as aluminium capsules for Nespresso.'
        elif 'GIMOKA' in u: desc=''; note+=' Gran Crema and Cioccolato are different products; resolve the mixed source name.'
    elif 'PISTACCHIO' in u or 'PISTACHIO' in u:
        category='Pistachio products'; note='Confirm spread/chocolate/biscuit form, full brand, net content and labelled pistachio percentage.'
        if any(x in u for x in ['SPREAD','CREMA','CREAM']):
            desc=f'{t}. Serve on toast or use as a filling for pastries and desserts.'
            use='Serving idea: spread a small amount on toast, or add it to a dessert.'
        if 'BAIOCCHI' in u:
            category='Biscuits'; reference=refs['baiocchi']; desc='Baiocchi Pistacchio pairs shortcrust biscuits with a soft pistachio cream filling.'
        if 'DULCIAR BAR' in u: category='Chocolate'; desc='Dulciar pistachio chocolate bar to serve in pieces alongside coffee or dessert.'
    elif any(x in u for x in ['BISCUIT','LADY FINGER','COOKIE','SAVIOARDI','WAFER','TORTINA']):
        category='Biscuits and wafers'; desc=f'{t} to enjoy with a drink or serve alongside dessert.'
        note='Confirm recipe, pack weight, count, ingredients and allergens.'
        if 'LADY FINGER' in u:
            use='Serving idea: use in layered desserts such as tiramisu.'
        if 'NUTELLA' in u:
            reference=refs['nutella']; desc='Nutella Biscuits have a crunchy biscuit shell and a creamy Nutella filling.'
        if 'TORTINA' in u:
            reference=refs['tortina']; desc='Tortina White combines crisp wafers, hazelnut cream and a white chocolate coating.'
            note+=' Confirm Loacker branding on held pack before adding brand to title.'
        if 'LOACKER' in u:
            fruit='blueberry' if 'BLUEBERRY' in u else 'raspberry'; reference=refs[fruit]
            desc=f'Loacker {fruit} wafers to enjoy with a drink or serve alongside dessert.'
            note+=' Manufacturer reference is Quadratini Yogurt; source does not confirm Quadratini versus Thins. No yogurt claim copied.'
        if 'POPPIES' in u:
            reference=refs['poppies']; desc='Poppies caramelised biscuits to serve with coffee or tea.'
    elif any(x in u for x in ['CHOC','DULCIAR BAR','LAICA BAR','PRALINE','FIN CARRE']):
        category='Chocolate'; desc=f'{t} for a sweet break or dessert plate.'
        note='Confirm chocolate type, filling, net weight and allergens. Do not infer cocoa percentage from an unexplained number.'
    elif any(x in u for x in ['GUMMY','VIDAL','FINI FRIED','FINI SMILE','GALATINE']):
        category='Sweets'; desc=f'{t} for your sweets selection.'
        note='Confirm exact flavour, confectionery type, net weight and allergens.'
        if 'GALATINE' in u:
            reference=refs['galatine']; desc=''; note+=' Blue packaging is not sufficient proof of the milk-tablet variant; manufacturer milk-tablet page is a candidate only.'
    elif 'OLIVE' in u and 'OIL' in u or 'DANTE EXTRA' in u:
        category='Cooking oils'; desc=f'{t} for dressing salads or adding to your cooking.'
        note='Confirm grade, net volume, origin and label storage directions. No acidity or certification claims inferred.'
    elif 'HONEY' in u:
        category='Honey'; desc=f'{t} to spoon onto toast or add to drinks and desserts.'
        note='Confirm brand spelling, floral origin, net weight and label. MILLEFIONI/MILLEFIORI are possible duplicates, not automatically merged.'
    elif 'CORNED BEEF' in u:
        category='Tinned meat'; desc=f'{t} for sandwiches or a cooked meal.'; note='Confirm can weight, ingredients and preparation/storage instructions.'
    elif any(x in u for x in ['LOTION','CONDITION','CREAM SOAP','CIEN OIL']):
        category='Personal care'; desc=f'{t} for your personal care shelf.'
        note='Confirm exact product type, volume, ingredients and manufacturer directions. No skin, hair-repair or treatment claims inferred.'
        if 'CIEN OIL' in u: desc=''
    elif any(x in u for x in ['PERFUME','FRAGRANCE','XBOLT','HOMME','JOLIE','CHALOU','LACURA']):
        category='Fragrance candidate'; note='Confirm brand, fragrance name, concentration, volume and whether single bottle or set. No scent notes, longevity or gender invented.'
        if 'PERFUME' in u or 'FRAGRANCE' in u: desc=f'{t} for your fragrance selection.'
    elif any(x in u for x in ['SLIPPER','UNDERGARMENT','PANTS','DRESS','SHORT','TSHIRT']):
        category='Clothing and footwear'; desc=f'{t} for your clothing and footwear selection.'
        note='Confirm materials, measurements, colour, size and fit; branded names need provenance before publication.'
    elif 'JEWELRY' in u:
        category='Jewellery and storage'; desc=f'{t}.'
        note='Confirm whether empty box or jewellery set, included items, dimensions and materials; do not infer precious metals.'
    elif 'PILL BOX' in u:
        category='Storage accessories'; desc='Pill box for keeping small items organised.'
        note='Confirm compartments, dimensions and materials; no childproof, food-safe or medical-device claims.'
    # A description adds a practical use, without inventing technical attributes.
    if category=='Clothing and footwear':
        if 'UNDERGARMENT' in u: desc=f'Bench Body undergarments in {"medium" if "MEDIUM" in u else "small"}.'
        elif 'KIDS' in u: desc='Children\'s slippers. Compare the actual foot measurements and size before choosing a pair.'
        elif 'SLIPPER' in u: desc=f'{t}. Check the available size and foot measurements when choosing your pair.'
        elif 'OVERSIZED' in u: desc='An oversized T-shirt for a relaxed outfit. Check the garment measurements for your preferred fit.'
        elif 'PANTS' in u: desc='Jogging pants for a casual outfit. Choose your size using the garment measurements.'
        elif 'DRESS' in u: desc='Dress. The style, colour and size will be specified after checking the actual garment.'
    if category=='Personal care':
        if 'SOAP' in u:
            desc=f'Cien {"honey and milk" if "HONEY" in u else "olive"} cream soap in a two-pack.'
        elif 'CONDITION' in u:
            desc=f'Cien {"Keratin" if "KERATIN" in u else "Macadamia"} conditioner. Follow the directions on the bottle when applying and rinsing.'
        elif 'LOTION' in u:
            desc=f'Amalfi {"Argan" if "ARGAN" in u else "Coco"} lotion for your personal care routine.'
    if category=='Fragrance candidate' and desc:
        desc=f'{t}. Check the bottle volume, concentration and set contents before ordering.'
    if category=='Jewellery and storage':
        desc=f'{t}. '+('An empty box for storing or presenting your own jewellery.' if 'EMPTY' in u else 'Included pieces will be listed after checking the actual set.')
    return category, desc, use, reference, note

groups=json.loads((ROOT/'.tools/real-inventory-20261013-01/prepared-groups.json').read_text(encoding='utf-8-sig'))
ids={g['name']:g['id'] for g in groups}
products=[]; stocks=[]
for i,r in enumerate(rows,1):
    original=r['name']; t=title(original); group=ids[original]
    cat,desc,use,url,note=content(original,t)
    notes=json.loads(r['internal_notes'])
    for stock in notes['stock']: stocks.append({'review_id':group,'source_name':original,**stock})
    price_missing=not any(s.get('pricePHP') is not None and str(s.get('pricePHP')).strip() for s in notes['stock'])
    gaps=['Held packaging and raw photo match','Physical saleable balance','Selling unit and price confirmation']
    if price_missing: gaps.append('No source selling price')
    if not re.search(r'\d\s*(?:G|KG|ML|LITER)\b',original,re.I): gaps.append('Net content or dimensions not supplied')
    if not desc: gaps.append('Resolve product identity before customer copy')
    products.append({'review_id':group,'source_rows':json.dumps(notes['sourceRows']), 'source_name':original,
      'proposed_public_name':t,'category_draft':cat,'description_draft':desc,'usage_draft':use,
      'seo_title_draft':(t+' | K2 Jimzon') if desc else '',
      'meta_description_draft':desc,'search_terms_draft':', '.join(dict.fromkeys([t,cat,'K2 Jimzon'])) if desc else '',
      'suggested_slug':re.sub(r'[^a-z0-9]+','-',t.lower()).strip('-'),
      'image_alt_draft':t+' packaging' if cat not in ['Clothing and footwear','Jewellery and storage','Storage accessories'] else t,
      'image_file_stem':group.lower()+'-'+re.sub(r'[^a-z0-9]+','-',t.lower()).strip('-'),
      'manufacturer_reference_url':url,'reference_status':'Candidate; held label not matched' if url else 'Owner name only; no exact manufacturer match established',
      'research_date':'2026-10-14' if url else '', 'staff_check':note,
      'photo_capture_needed':'Front pack; back ingredients/allergens/directions; net content; batch and expiry; multipack contents or garment measurements as applicable. Preserve original files.',
      'remaining_fields':'; '.join(gaps), 'barcode':'', 'sku':'', 'ingredients':'','allergens':'','storage_instructions':'',
      'country_of_origin':'','primary_image_url':'', 'publication_status':'DRAFT REVIEW ONLY',
      'original_internal_notes':r['internal_notes']})

def write_csv(filename, items):
    with (OUT/filename).open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(items[0])); w.writeheader(); w.writerows(items)
write_csv('K2_PRODUCT_CONTENT_REVIEW.csv',products)
(OUT/'K2_PRODUCT_CONTENT_REVIEW.json').write_text(json.dumps(products,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'K2_SOURCE_STOCK_PRESERVED.json').write_text(json.dumps(stocks,ensure_ascii=False,indent=2),encoding='utf-8')
receipt={'state':'OFFLINE CONTENT DRAFTS; NOT IMPORTED OR PUBLISHED','owning_map':'MAP-023','idea':'IDEA-20261014-04',
 'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'products':len(products),'stock_rows':len(stocks),
 'description_drafts':sum(bool(p['description_draft']) for p in products),
 'manufacturer_reference_candidates':sum(bool(p['manufacturer_reference_url']) for p in products),
 'identity_holds':sum(not bool(p['description_draft']) for p in products),
 'barcode_decision':'Owner defers entry until later SKU-by-SKU work',
 'assets_generated':0,'source_quantities_changed':False,'stock_balance_verified':False,'provider_changes':False}
assert len(products)==196 and len(stocks)==241
assert len({s['sourceRow'] for s in stocks})==241
assert all(p['original_internal_notes']==r['internal_notes'] for p,r in zip(products,rows))
assert all('\u2014' not in p['description_draft'] and '\u2013' not in p['description_draft'] for p in products)
assert all(p['publication_status']=='DRAFT REVIEW ONLY' for p in products)
(OUT/'verification.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
print(json.dumps(receipt,indent=2))
