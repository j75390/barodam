# 상품 500개 목록 + 상품별 사진 생성 프롬프트를 만든다 (catalog.json). 사진은 gen/<id>.jpg
import json, random, pathlib
random.seed(20261118)
root = pathlib.Path(__file__).parent

# type: (category, [(한국어 이름, 영어 사진 설명)], 상품 수)
T = {
 'tee': ('fashion', [('오버핏 헤비코튼 반팔 티셔츠','oversized heavy cotton short-sleeve t-shirt'),('스탠다드 로고 롱슬리브','long sleeve t-shirt with small chest print'),('와플 조직 헨리넥 티셔츠','waffle-knit henley t-shirt'),('릴렉스핏 피그먼트 반팔','pigment-dyed relaxed t-shirt'),('기능성 쿨 티셔츠','athletic dry-fit t-shirt'),('빈티지 그래픽 티셔츠','vintage graphic t-shirt with abstract print')], 30),
 'shirt': ('fashion', [('옥스포드 버튼다운 셔츠','oxford button-down shirt'),('린넨 오픈카라 셔츠','linen open-collar shirt'),('스트라이프 오버 셔츠','striped oversized shirt'),('코듀로이 워크 셔츠','corduroy work shirt'),('플란넬 체크 셔츠','flannel check shirt')], 22),
 'knit': ('fashion', [('램스울 크루넥 니트','lambswool crewneck sweater'),('케이블 꽈배기 니트','cable-knit sweater'),('하프집업 스웨터','half-zip knit sweater'),('브이넥 가디건','v-neck button cardigan'),('터틀넥 니트','turtleneck sweater')], 26),
 'hoodie': ('fashion', [('기모 후드 집업','fleece-lined zip-up hoodie'),('스웻 후디','pullover hoodie'),('헤비웨이트 맨투맨','heavyweight crewneck sweatshirt'),('아치 로고 스웻셔츠','sweatshirt with arched embroidered lettering (no real brand)')], 22),
 'coat': ('fashion', [('울 블렌드 싱글 코트','wool blend single-breasted coat'),('경량 구스다운 패딩','lightweight goose down puffer jacket'),('숏 푸퍼 재킷','short puffer jacket'),('플리스 보아 재킷','sherpa fleece jacket'),('발마칸 롱 코트','balmacaan long coat'),('후드 롱패딩','hooded long down parka'),('윈드브레이커 아노락','windbreaker anorak')], 40),
 'pants': ('fashion', [('와이드 데님 팬츠','wide-leg denim jeans'),('원턱 코튼 치노','pleated cotton chino trousers'),('조거 트레이닝 팬츠','jogger sweatpants'),('세미와이드 슬랙스','semi-wide wool slacks'),('카고 나일론 팬츠','nylon cargo pants')], 30),
 'sneaker': ('shoes', [('캔버스 스니커즈','canvas low-top sneakers'),('쿠셔닝 러닝화','cushioned running shoes'),('레더 코트화','leather court sneakers'),('청키 스니커즈','chunky dad sneakers'),('슬립온 운동화','slip-on mesh shoes'),('트레일 러닝화','trail running shoes')], 34),
 'boot': ('shoes', [('방수 워커 부츠','waterproof work boots'),('스웨이드 첼시 부츠','suede chelsea boots'),('퍼 방한 부츠','fur-lined winter snow boots'),('컴뱃 부츠','lace-up combat boots')], 16),
 'socks': ('shoes', [('스포츠 양말 5족','five pairs of athletic socks'),('울 혼방 겨울 양말 3족','three pairs of wool winter socks'),('페이크삭스 10족','ten pairs of no-show socks')], 8),
 'bag': ('bag', [('미니 숄더백','mini leather shoulder bag'),('캔버스 에코백','canvas tote bag'),('레더 크로스백','leather crossbody bag'),('나일론 숄더백','nylon shoulder bag'),('호보백','slouchy hobo bag')], 26),
 'backpack': ('bag', [('노트북 백팩 22L','laptop backpack'),('롤탑 방수 백팩','roll-top waterproof backpack'),('경량 데이팩','lightweight daypack'),('캠퍼스 백팩','classic school backpack')], 18),
 'cap': ('bag', [('워싱 볼캡','washed baseball cap'),('코튼 버킷햇','cotton bucket hat'),('울 비니','ribbed wool beanie'),('캠프캡','5-panel camp cap')], 18),
 'wallet': ('bag', [('소가죽 반지갑','leather bifold wallet'),('슬림 카드지갑','slim leather card holder'),('지퍼 장지갑','zip-around long wallet'),('미니 동전지갑','small coin purse')], 14),
 'phones': ('digital', [('노이즈캔슬링 무선 헤드폰','over-ear wireless noise cancelling headphones'),('모니터 헤드폰','studio monitor headphones'),('무선 이어폰','true wireless earbuds with charging case'),('게이밍 헤드셋','gaming headset with boom mic')], 22),
 'watch': ('digital', [('스마트워치','smartwatch with blank black screen'),('스마트밴드','fitness band tracker'),('메탈 손목시계','classic metal analog wristwatch'),('디지털 아웃도어 시계','rugged digital outdoor watch')], 20),
 'keyboard': ('digital', [('저소음 무선 키보드','slim wireless keyboard'),('기계식 키보드 87키','tenkeyless mechanical keyboard'),('로우프로파일 키보드','low-profile keyboard')], 14),
 'mouse': ('digital', [('무소음 무선 마우스','wireless silent mouse'),('버티컬 마우스','ergonomic vertical mouse'),('게이밍 마우스','lightweight gaming mouse')], 10),
 'speaker': ('digital', [('방수 블루투스 스피커','portable waterproof bluetooth speaker'),('북쉘프 스피커','pair of bookshelf speakers'),('무드등 스피커','speaker with ambient light')], 10),
 'mug': ('living', [('도자기 머그컵','ceramic mug'),('이중 유리 머그','double wall glass mug'),('법랑 머그','enamel camping mug'),('스톤웨어 컵','handmade stoneware cup')], 16),
 'tumbler': ('living', [('보온 텀블러 500ml','stainless steel insulated tumbler'),('콜드컵 710ml','cold cup with straw'),('보온병 350ml','compact thermos flask'),('물병 1L','large water bottle')], 14),
 'pan': ('living', [('인덕션 프라이팬 28cm','non-stick frying pan'),('무쇠 스킬렛','cast iron skillet'),('세라믹 웍','ceramic coated wok')], 10),
 'lamp': ('living', [('무드등 스탠드','small mushroom table lamp'),('LED 독서 스탠드','LED desk lamp'),('클립 조명','clip-on reading lamp')], 10),
 'pillow': ('living', [('경추 베개','memory foam pillow'),('쿠션 커버 45cm','decorative cushion'),('호텔식 베개','hotel down pillow')], 10),
 'towel': ('living', [('호텔식 수건 10장','stack of folded hotel towels'),('헤어 드라이 타월','microfiber hair towel'),('비치 타월','rolled beach towel')], 8),
 'candle': ('living', [('소이 캔들 200g','soy candle in glass jar'),('디퓨저 200ml','reed diffuser'),('티라이트 캔들','tealight candles')], 10),
 'bottle': ('beauty', [('수분 진정 토너','toner bottle with blank label'),('클렌징 오일','cleansing oil pump bottle with blank label'),('히알루론 앰플','dropper serum bottle with blank label'),('비타민C 세럼','amber dropper bottle with blank label')], 18),
 'tube': ('beauty', [('톤업 선크림','sunscreen tube with blank label'),('시카 크림','cream jar with blank label'),('립밤 세트','three lip balms'),('폼 클렌저','facial cleanser tube with blank label')], 16),
 'perfume': ('beauty', [('오 드 퍼퓸 50ml','perfume bottle with blank label'),('바디 미스트','body mist spray bottle with blank label'),('고체 향수','solid perfume tin')], 10),
 'fruit': ('food', [('제주 감귤 3kg','box of fresh mandarin oranges'),('꿀참외 2kg','korean melons'),('부사 사과 5kg','red fuji apples'),('샤인머스캣','green shine muscat grapes'),('딸기 500g','fresh strawberries in a punnet')], 18),
 'meat': ('food', [('한우 등심 300g','raw marbled beef sirloin on butcher paper'),('돼지 앞다리살 1kg','raw pork shoulder slices'),('닭가슴살 10팩','packaged chicken breast'),('양념 LA갈비','marinated beef short ribs')], 12),
 'coffee': ('food', [('콜드브루 원액 1L','cold brew coffee bottle with blank label'),('싱글오리진 원두 500g','coffee bean bag with blank label'),('드립백 커피','drip bag coffee packets'),('보리차 티백','barley tea bags')], 12),
 'nuts': ('food', [('견과류 데일리 30봉','mixed nuts in small packs'),('구운 아몬드 1kg','roasted almonds in a bowl'),('캐슈넛 500g','cashew nuts in a bowl'),('호두 1kg','walnut halves in a bowl')], 10),
}
BRANDS = {'fashion':['노스폴드','베이직무드','모노픽','로우라인','하이드아웃','어반트레일','클라우드핏'],'shoes':['스텝라인','런데이','모노픽','데일리풋'],
 'bag':['하루랩','모노픽','베이직무드','레더리','어반트레일'],'digital':['사운드핏','오디오랩','핏트랙','타건공방','클릭랩','타임워크'],
 'living':['소담키친','하루랩','흙빛공방','밝은방','폭신당','향기온','키친하우스'],'beauty':['맑은결','그린노트','데이로그','향기온'],'food':['산지직송','바른곳간','들녘','고기마을','커피상점']}
SUFFIX = {'fashion':['','에센셜','프리미엄','릴렉스핏','시즌2','클래식','데일리','라이트','헤비','투톤'],'shoes':['','2.0','라이트','프로','클래식','에어','플러스'],
 'bag':['','미니','라지','에센셜','클래식','플러스'],'digital':['','2세대','프로','라이트','플러스','맥스','SE'],'living':['','에센셜','프리미엄','미니','라지','클래식'],
 'beauty':['','리뉴얼','기획세트','대용량','미니','민감용'],'food':['','특품','가정용','선물세트','대용량','실속형']}
COLORS = [('블랙','black'),('아이보리','ivory'),('네이비','navy'),('차콜','charcoal grey'),('세이지','sage green'),('라벤더','lavender'),('베이지','beige'),('그레이','light grey'),('버건디','burgundy'),('카키','khaki'),('스카이블루','sky blue'),('크림','cream'),('브라운','brown'),('머스타드','mustard yellow'),('올리브','olive'),('화이트','white')]
COLORED = {'fashion','shoes','bag'} ; COLORED_T = {'mug','tumbler','pillow','towel','keyboard','mouse','phones','speaker','watch','pan','lamp','candle'}
BGS = ['light grey seamless studio background','warm beige seamless background','white seamless background','soft pastel background','light wooden surface','concrete texture surface']
ANG = ['front view','three-quarter view','top-down flat lay','side view','slightly elevated angle']

TOTAL=sum(v[2] for v in T.values()); quota={t:max(4,round(v[2]*500/TOTAL)) for t,v in T.items()}
diff=500-sum(quota.values()); big=sorted(quota,key=lambda t:-quota[t])
for i in range(abs(diff)): quota[big[i%len(big)]]+= 1 if diff>0 else -1
items=[]; used=set(); pid=0
for typ,(cat,bases,_c) in T.items():
    count=quota[typ]
    for k in range(count):
        tries=0
        while True:
            ko,en = bases[(k+tries)%len(bases)]
            suf = SUFFIX[cat][((k+tries)//len(bases))%len(SUFFIX[cat])]
            brand = BRANDS[cat][(k*3+tries)%len(BRANDS[cat])]
            name = f"{brand} {ko}" + (f" {suf}" if suf else "")
            if name not in used: break
            tries+=1
        used.add(name); pid+=1
        colored = cat in COLORED or typ in COLORED_T
        ck,ce = random.choice(COLORS) if colored else ('','')
        prompt = (f"Square e-commerce product photo of a {ce+' ' if ce else ''}{en}, {random.choice(ANG)}, {random.choice(BGS)}, "
                  "soft natural studio lighting, realistic, high detail, no text, no watermark, no real brand logos, no people")
        items.append({'id':pid,'f':f'p{pid:03d}.jpg','type':typ,'cat':cat,'name':name,'brand':brand,'color':ck,'prompt':prompt})
print(len(items),'items')
json.dump(items, open(root/'catalog.json','w',encoding='utf8'), ensure_ascii=False, indent=0)
# banners and category icons (reserved, not used for any product)
extra=[
 ('hero0','Wide lifestyle photo of winter puffer jackets and wool coats on a clothing rack in a bright minimal store, no text, no logos, no people'),
 ('hero1','Lifestyle photo of stacked cozy knit sweaters in warm tones on a wooden table, soft light, no text, no logos, no people'),
 ('hero2','Overhead photo of premium raw marbled beef and fresh mandarins and apples on a dark slate table, no text, no people'),
 ('hero3','Moody product photo of wireless headphones and a mechanical keyboard on a dark desk with soft rim light, no text, no logos, no people'),
 ('cat_fashion','Square photo of a folded stack of colorful t-shirts and sweaters, plain light background, no text, no logos'),
 ('cat_shoes','Square photo of a single white sneaker, plain light background, no text, no logos'),
 ('cat_bag','Square photo of a tan leather tote bag, plain light background, no text, no logos'),
 ('cat_digital','Square photo of black wireless headphones, plain light background, no text, no logos'),
 ('cat_living','Square photo of a ceramic mug and a small candle, plain light background, no text'),
 ('cat_beauty','Square photo of skincare bottles with blank labels, plain light background, no text'),
 ('cat_food','Square photo of fresh fruit in a basket, plain light background, no text'),
]
json.dump([{'key':k,'f':k+'.jpg','prompt':p} for k,p in extra], open(root/'extras.json','w',encoding='utf8'), ensure_ascii=False, indent=0)
