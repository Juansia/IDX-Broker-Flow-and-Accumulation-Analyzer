
"use strict";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- Tema ---------- */
(function initTheme(){
  const saved = localStorage.getItem('bdm_theme');
  const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
$('#btnTheme').onclick = () => {
  const el = document.documentElement;
  el.dataset.theme = el.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('bdm_theme', el.dataset.theme);
  renderHistory(); // re-render chart warna
};

/* ---------- Tab ---------- */
$('#tabs').addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  $$('#tabs button').forEach(x=>x.classList.toggle('active', x===b));
  $$('.panel').forEach(p=>p.classList.toggle('active', p.id==='panel-'+b.dataset.tab));
  if(b.dataset.tab==='hist') renderHistory();
  if(b.dataset.tab==='bt') initBT();
  if(b.dataset.tab==='tk') initTK();
  if(b.dataset.tab==='md') initMD();
});

/* ---------- Daftar emiten BEI (951 saham, sumber: IDX via Dataset-Saham-IDX, termasuk IPO s.d. awal 2025; kode di luar daftar tetap diterima) ---------- */
const IDX_STOCKS={"AALI":"Astra Agro Lestari Tbk.","ABBA":"Mahaka Media Tbk.","ABDA":"Asuransi Bina Dana Arta Tbk.","ABMM":"ABM Investama Tbk.","ACES":"Aspirasi Hidup Indonesia Tbk.","ACST":"Acset Indonusa Tbk.","ADES":"Akasha Wira International Tbk.","ADHI":"Adhi Karya (Persero) Tbk.","ADMF":"Adira Dinamika Multi Finance T","ADMG":"Polychem Indonesia Tbk","ADRO":"Alamtri Resources Indonesia Tb","AGII":"Samator Indo Gas Tbk.","AGRO":"Bank Raya Indonesia Tbk.","AGRS":"Bank IBK Indonesia Tbk.","AHAP":"Asuransi Harta Aman Pratama Tb","AIMS":"Artha Mahiya Investama Tbk.","AISA":"FKS Food Sejahtera Tbk.","AKKU":"Anugerah Kagum Karya Utama Tbk","AKPI":"Argha Karya Prima Industry Tbk","AKRA":"AKR Corporindo Tbk.","AKSI":"Mineral Sumberdaya Mandiri Tbk","ALDO":"Alkindo Naratama Tbk.","ALKA":"Alakasa Industrindo Tbk","ALMI":"Alumindo Light Metal Industry","ALTO":"Tri Banyan Tirta Tbk.","AMAG":"Asuransi Multi Artha Guna Tbk.","AMFG":"Asahimas Flat Glass Tbk.","AMIN":"Ateliers Mecaniques D Indonesi","AMRT":"Sumber Alfaria Trijaya Tbk.","ANJT":"Austindo Nusantara Jaya Tbk.","ANTM":"Aneka Tambang Tbk.","APEX":"Apexindo Pratama Duta Tbk.","APIC":"Pacific Strategic Financial Tb","APII":"Arita Prima Indonesia Tbk.","APLI":"Asiaplast Industries Tbk.","APLN":"Agung Podomoro Land Tbk.","ARGO":"Argo Pantes Tbk","ARII":"Atlas Resources Tbk.","ARNA":"Arwana Citramulia Tbk.","ARTA":"Arthavest Tbk","ARTI":"Ratu Prabu Energi Tbk","ARTO":"Bank Jago Tbk.","ASBI":"Asuransi Bintang Tbk.","ASDM":"Asuransi Dayin Mitra Tbk.","ASGR":"Astra Graphia Tbk.","ASII":"Astra International Tbk.","ASJT":"Asuransi Jasa Tania Tbk.","ASMI":"Asuransi Maximus Graha Persada","ASRI":"Alam Sutera Realty Tbk.","ASRM":"Asuransi Ramayana Tbk.","ASSA":"Adi Sarana Armada Tbk.","ATIC":"Anabatic Technologies Tbk.","AUTO":"Astra Otoparts Tbk.","BABP":"Bank MNC Internasional Tbk.","BACA":"Bank Capital Indonesia Tbk.","BAJA":"Saranacentral Bajatama Tbk.","BALI":"Bali Towerindo Sentra Tbk.","BAPA":"Bekasi Asri Pemula Tbk.","BATA":"Sepatu Bata Tbk.","BAYU":"Bayu Buana Tbk","BBCA":"Bank Central Asia Tbk.","BBHI":"Allo Bank Indonesia Tbk.","BBKP":"Bank KB Bukopin Tbk.","BBLD":"Buana Finance Tbk.","BBMD":"Bank Mestika Dharma Tbk.","BBNI":"Bank Negara Indonesia (Persero","BBRI":"Bank Rakyat Indonesia (Persero","BBRM":"Pelayaran Nasional Bina Buana","BBTN":"Bank Tabungan Negara (Persero)","BBYB":"Bank Neo Commerce Tbk.","BCAP":"MNC Kapital Indonesia Tbk.","BCIC":"Bank JTrust Indonesia Tbk.","BCIP":"Bumi Citra Permai Tbk.","BDMN":"Bank Danamon Indonesia Tbk.","BEKS":"Bank Pembangunan Daerah Banten","BEST":"Bekasi Fajar Industrial Estate","BFIN":"BFI Finance  Indonesia Tbk.","BGTG":"Bank Ganesha Tbk.","BHIT":"MNC Asia Holding Tbk.","BIKA":"Binakarya Jaya Abadi Tbk.","BIMA":"Primarindo Asia Infrastructure","BINA":"Bank Ina Perdana Tbk.","BIPI":"Astrindo Nusantara Infrastrukt","BIPP":"Bhuwanatala Indah Permai Tbk.","BIRD":"Blue Bird Tbk.","BISI":"BISI International Tbk.","BJBR":"Bank Pembangunan Daerah Jawa B","BJTM":"Bank Pembangunan Daerah Jawa T","BKDP":"Bukit Darmo Property Tbk","BKSL":"Sentul City Tbk.","BKSW":"Bank QNB Indonesia Tbk.","BLTA":"Berlian Laju Tanker Tbk","BLTZ":"Graha Layar Prima Tbk.","BMAS":"Bank Maspion Indonesia Tbk.","BMRI":"Bank Mandiri (Persero) Tbk.","BMSR":"Bintang Mitra Semestaraya Tbk","BMTR":"Global Mediacom Tbk.","BNBA":"Bank Bumi Arta Tbk.","BNBR":"Bakrie & Brothers Tbk","BNGA":"Bank CIMB Niaga Tbk.","BNII":"Bank Maybank Indonesia Tbk.","BNLI":"Bank Permata Tbk.","BOLT":"Garuda Metalindo Tbk.","BPFI":"Woori Finance Indonesia Tbk.","BPII":"Batavia Prosperindo Internasio","BRAM":"Indo Kordsa Tbk.","BRMS":"Bumi Resources Minerals Tbk.","BRNA":"Berlina Tbk.","BRPT":"Barito Pacific Tbk.","BSDE":"Bumi Serpong Damai Tbk.","BSIM":"Bank Sinarmas Tbk.","BSSR":"Baramulti Suksessarana Tbk.","BSWD":"Bank Of India Indonesia Tbk.","BTEK":"Bumi Teknokultura Unggul Tbk","BTEL":"Bakrie Telecom Tbk.","BTON":"Betonjaya Manunggal Tbk.","BTPN":"Bank SMBC Indonesia Tbk.","BUDI":"Budi Starch & Sweetener Tbk.","BUKK":"Bukaka Teknik Utama Tbk.","BULL":"Buana Lintas Lautan Tbk.","BUMI":"Bumi Resources Tbk.","BUVA":"Bukit Uluwatu Villa Tbk.","BVIC":"Bank Victoria International Tb","BWPT":"Eagle High Plantations Tbk.","BYAN":"Bayan Resources Tbk.","CANI":"Capitol Nusantara Indonesia Tb","CASS":"Cardig Aero Services Tbk.","CEKA":"Wilmar Cahaya Indonesia Tbk.","CENT":"Centratama Telekomunikasi Indo","CFIN":"Clipan Finance Indonesia Tbk.","CINT":"Chitose Internasional Tbk.","CITA":"Cita Mineral Investindo Tbk.","CLPI":"Colorpak Indonesia Tbk.","CMNP":"Citra Marga Nusaphala Persada","CMPP":"AirAsia Indonesia Tbk.","CNKO":"Exploitasi Energi Indonesia Tb","CNTX":"Century Textile Industry Tbk.","COWL":"Cowell Development Tbk.","CPIN":"Charoen Pokphand Indonesia Tbk","CPRO":"Central Proteina Prima Tbk.","CSAP":"Catur Sentosa Adiprana Tbk.","CTBN":"Citra Tubindo Tbk.","CTRA":"Ciputra Development Tbk.","CTTH":"Citatah Tbk.","DART":"Duta Anggada Realty Tbk.","DEFI":"Danasupra Erapacific Tbk.","DEWA":"Darma Henwa Tbk","DGIK":"Nusa Konstruksi Enjiniring Tbk","DILD":"Intiland Development Tbk.","DKFT":"Central Omega Resources Tbk.","DLTA":"Delta Djakarta Tbk.","DMAS":"Puradelta Lestari Tbk.","DNAR":"Bank Oke Indonesia Tbk.","DNET":"Indoritel Makmur Internasional","DOID":"Delta Dunia Makmur Tbk.","DPNS":"Duta Pertiwi Nusantara Tbk.","DSFI":"Dharma Samudera Fishing Indust","DSNG":"Dharma Satya Nusantara Tbk.","DSSA":"Dian Swastatika Sentosa Tbk","DUTI":"Duta Pertiwi Tbk","DVLA":"Darya-Varia Laboratoria Tbk.","DYAN":"Dyandra Media International Tb","ECII":"Electronic City Indonesia Tbk.","EKAD":"Ekadharma International Tbk.","ELSA":"Elnusa Tbk.","ELTY":"Bakrieland Development Tbk.","EMDE":"Megapolitan Developments Tbk.","EMTK":"Elang Mahkota Teknologi Tbk.","ENRG":"Energi Mega Persada Tbk.","EPMT":"Enseval Putera Megatrading Tbk","ERAA":"Erajaya Swasembada Tbk.","ERTX":"Eratex Djaja Tbk.","ESSA":"ESSA Industries Indonesia Tbk.","ESTI":"Ever Shine Tex Tbk.","ETWA":"Eterindo Wahanatama Tbk","EXCL":"XL Axiata Tbk.","FAST":"Fast Food Indonesia Tbk.","FASW":"Fajar Surya Wisesa Tbk.","FISH":"FKS Multi Agro Tbk.","FMII":"Fortune Mate Indonesia Tbk","FORU":"Fortune Indonesia Tbk","FPNI":"Lotte Chemical Titan Tbk.","FREN":"Smartfren Telecom Tbk.","GAMA":"Aksara Global Development Tbk.","GDST":"Gunawan Dianjaya Steel Tbk.","GDYR":"Goodyear Indonesia Tbk.","GEMA":"Gema Grahasarana Tbk.","GEMS":"Golden Energy Mines Tbk.","GGRM":"Gudang Garam Tbk.","GIAA":"Garuda Indonesia (Persero) Tbk","GJTL":"Gajah Tunggal Tbk.","GLOB":"Globe Kita Terang Tbk.","GMTD":"Gowa Makassar Tourism Developm","GOLD":"Visi Telekomunikasi Infrastruk","GOLL":"Golden Plantation Tbk.","GPRA":"Perdana Gapuraprima Tbk.","GSMF":"Equity Development Investment","GTBO":"Garda Tujuh Buana Tbk","GWSA":"Greenwood Sejahtera Tbk.","GZCO":"Gozco Plantations Tbk.","HADE":"Himalaya Energi Perkasa Tbk.","HDFA":"Radana Bhaskara Finance Tbk.","HDTX":"Panasia Indo Resources Tbk.","HERO":"DFI Retail Nusantara Tbk.","HEXA":"Hexindo Adiperkasa Tbk.","HITS":"Humpuss Intermoda Transportasi","HMSP":"H.M. Sampoerna Tbk.","HOME":"Hotel Mandarine Regency Tbk.","HOTL":"Saraswati Griya Lestari Tbk.","HRUM":"Harum Energy Tbk.","IATA":"MNC Energy Investments Tbk.","IBFN":"Intan Baru Prana Tbk.","IBST":"Inti Bangun Sejahtera Tbk.","ICBP":"Indofood CBP Sukses Makmur Tbk","ICON":"Island Concepts Indonesia Tbk.","IGAR":"Champion Pacific Indonesia Tbk","IIKP":"Inti Agri Resources Tbk","IKAI":"Intikeramik Alamasri Industri","IKBI":"Sumi Indo Kabel Tbk.","IMAS":"Indomobil Sukses Internasional","IMJS":"Indomobil Multi Jasa Tbk.","IMPC":"Impack Pratama Industri Tbk.","INAF":"Indofarma Tbk.","INAI":"Indal Aluminium Industry Tbk.","INCI":"Intanwijaya Internasional Tbk","INCO":"Vale Indonesia Tbk.","INDF":"Indofood Sukses Makmur Tbk.","INDR":"Indo-Rama Synthetics Tbk.","INDS":"Indospring Tbk.","INDX":"Tanah Laut Tbk","INDY":"Indika Energy Tbk.","INKP":"Indah Kiat Pulp & Paper Tbk.","INPC":"Bank Artha Graha Internasional","INPP":"Indonesian Paradise Property T","INRU":"Toba Pulp Lestari Tbk.","INTA":"Intraco Penta Tbk.","INTD":"Inter Delta Tbk","INTP":"Indocement Tunggal Prakarsa Tb","IPOL":"Indopoly Swakarsa Industry Tbk","ISAT":"Indosat Tbk.","ISSP":"Steel Pipe Industry of Indones","ITMA":"Sumber Energi Andalan Tbk.","ITMG":"Indo Tambangraya Megah Tbk.","JAWA":"Jaya Agra Wattie Tbk.","JECC":"Jembo Cable Company Tbk.","JIHD":"Jakarta International Hotels &","JKON":"Jaya Konstruksi Manggala Prata","JKSW":"Jakarta Kyoei Steel Works Tbk.","JPFA":"Japfa Comfeed Indonesia Tbk.","JRPT":"Jaya Real Property Tbk.","JSMR":"Jasa Marga (Persero) Tbk.","JSPT":"Jakarta Setiabudi Internasiona","JTPE":"Jasuindo Tiga Perkasa Tbk.","KAEF":"Kimia Farma Tbk.","KARW":"Meratus Jasa Prima Tbk.","KBLI":"KMI Wire & Cable Tbk.","KBLM":"Kabelindo Murni Tbk.","KBLV":"First Media Tbk.","KBRI":"Kertas Basuki Rachmat Indonesi","KDSI":"Kedawung Setia Industrial Tbk.","KIAS":"Keramika Indonesia Assosiasi T","KICI":"Kedaung Indah Can Tbk","KIJA":"Kawasan Industri Jababeka Tbk.","KKGI":"Resource Alam Indonesia Tbk.","KLBF":"Kalbe Farma Tbk.","KOBX":"Kobexindo Tractors Tbk.","KOIN":"Kokoh Inti Arebama Tbk","KONI":"Perdana Bangun Pusaka Tbk","KOPI":"Mitra Energi Persada Tbk.","KPIG":"MNC Land Tbk.","KRAH":"Grand Kartech Tbk.","KRAS":"Krakatau Steel (Persero) Tbk.","KREN":"Quantum Clovera Investama Tbk.","LAPD":"Leyand International Tbk.","LCGP":"Eureka Prima Jakarta Tbk.","LEAD":"Logindo Samudramakmur Tbk.","LINK":"Link Net Tbk.","LION":"Lion Metal Works Tbk.","LMAS":"Limas Indonesia Makmur Tbk","LMPI":"Langgeng Makmur Industri Tbk.","LMSH":"Lionmesh Prima Tbk.","LPCK":"Lippo Cikarang Tbk","LPGI":"Lippo General Insurance Tbk.","LPIN":"Multi Prima Sejahtera Tbk","LPKR":"Lippo Karawaci Tbk.","LPLI":"Star Pacific Tbk","LPPF":"Matahari Department Store Tbk.","LPPS":"Lenox Pasifik Investama Tbk.","LRNA":"Eka Sari Lorena Transport Tbk.","LSIP":"PP London Sumatra Indonesia Tb","LTLS":"Lautan Luas Tbk.","MAGP":"Multi Agro Gemilang Plantation","MAIN":"Malindo Feedmill Tbk.","MAMI":"Mas Murni Indonesia Tbk","MAPI":"Mitra Adiperkasa Tbk.","MASA":"Multistrada Arah Sarana Tbk.","MAYA":"Bank Mayapada Internasional Tb","MBAP":"Mitrabara Adiperdana Tbk.","MBSS":"Mitrabahtera Segara Sejati Tbk","MBTO":"Martina Berto Tbk.","MCOR":"Bank China Construction Bank I","MDIA":"Intermedia Capital Tbk.","MDKA":"Merdeka Copper Gold Tbk.","MDLN":"Modernland Realty Tbk.","MDRN":"Modern Internasional Tbk.","MEDC":"Medco Energi Internasional Tbk","MEGA":"Bank Mega Tbk.","MERK":"Merck Tbk.","META":"Nusantara Infrastructure Tbk.","MFIN":"Mandala Multifinance Tbk.","MFMI":"Multifiling Mitra Indonesia Tb","MGNA":"Magna Investama Mandiri Tbk.","MICE":"Multi Indocitra Tbk.","MIDI":"Midi Utama Indonesia Tbk.","MIKA":"Mitra Keluarga Karyasehat Tbk.","MIRA":"Mitra International Resources","MITI":"Mitra Investindo Tbk.","MKPI":"Metropolitan Kentjana Tbk.","MLBI":"Multi Bintang Indonesia Tbk.","MLIA":"Mulia Industrindo Tbk","MLPL":"Multipolar Tbk.","MLPT":"Multipolar Technology Tbk.","MMLP":"Mega Manunggal Property Tbk.","MNCN":"Media Nusantara Citra Tbk.","MPMX":"Mitra Pinasthika Mustika Tbk.","MPPA":"Matahari Putra Prima Tbk.","MRAT":"Mustika Ratu Tbk.","MREI":"Maskapai Reasuransi Indonesia","MSKY":"MNC Sky Vision Tbk.","MTDL":"Metrodata Electronics Tbk.","MTFN":"Capitalinc Investment Tbk.","MTLA":"Metropolitan Land Tbk.","MTSM":"Metro Realty Tbk.","MYOH":"Samindo Resources Tbk.","MYOR":"Mayora Indah Tbk.","MYRX":"Hanson International Tbk.","MYTX":"Asia Pacific Investama Tbk.","NELY":"Pelayaran Nelly Dwi Putri Tbk.","NIKL":"Pelat Timah Nusantara Tbk.","NIPS":"Nipress Tbk.","NIRO":"City Retail Developments Tbk.","NISP":"Bank OCBC NISP Tbk.","NOBU":"Bank Nationalnobu Tbk.","NRCA":"Nusa Raya Cipta Tbk.","OCAP":"Onix Capital Tbk.","OKAS":"Ancora Indonesia Resources Tbk","OMRE":"Indonesia Prima Property Tbk","PADI":"Minna Padi Investama Sekuritas","PALM":"Provident Investasi Bersama Tb","PANR":"Panorama Sentrawisata Tbk.","PANS":"Panin Sekuritas Tbk.","PBRX":"Pan Brothers Tbk.","PDES":"Destinasi Tirta Nusantara Tbk","PEGE":"Panca Global Kapital Tbk.","PGAS":"Perusahaan Gas Negara Tbk.","PGLI":"Pembangunan Graha Lestari Inda","PICO":"Pelangi Indah Canindo Tbk","PJAA":"Pembangunan Jaya Ancol Tbk.","PKPK":"Perdana Karya Perkasa Tbk","PLAS":"Polaris Investama Tbk","PLIN":"Plaza Indonesia Realty Tbk.","PNBN":"Bank Pan Indonesia Tbk","PNBS":"Bank Panin Dubai Syariah Tbk.","PNIN":"Paninvest Tbk.","PNLF":"Panin Financial Tbk.","PNSE":"Pudjiadi & Sons Tbk.","POLY":"Asia Pacific Fibers Tbk","POOL":"Pool Advista Indonesia Tbk.","PPRO":"PP Properti Tbk.","PRAS":"Prima Alloy Steel Universal Tb","PSAB":"J Resources Asia Pasifik Tbk.","PSDN":"Prasidha Aneka Niaga Tbk","PSKT":"Red Planet Indonesia Tbk.","PTBA":"Bukit Asam Tbk.","PTIS":"Indo Straits Tbk.","PTPP":"PP (Persero) Tbk.","PTRO":"Petrosea Tbk.","PTSN":"Sat Nusapersada Tbk","PTSP":"Pioneerindo Gourmet Internatio","PUDP":"Pudjiadi Prestige Tbk.","PWON":"Pakuwon Jati Tbk.","PYFA":"Pyridam Farma Tbk","RAJA":"Rukun Raharja Tbk.","RALS":"Ramayana Lestari Sentosa Tbk.","RANC":"Supra Boga Lestari Tbk.","RBMS":"Ristia Bintang Mahkotasejati T","RDTX":"Roda Vivatex Tbk","RELI":"Reliance Sekuritas Indonesia T","RICY":"Ricky Putra Globalindo Tbk","RIGS":"Rig Tenders Indonesia Tbk.","RIMO":"Rimo International Lestari Tbk","RODA":"Pikko Land Development Tbk.","ROTI":"Nippon Indosari Corpindo Tbk.","RUIS":"Radiant Utama Interinsco Tbk.","SAFE":"Steady Safe Tbk","SAME":"Sarana Meditama Metropolitan T","SCCO":"Supreme Cable Manufacturing &","SCMA":"Surya Citra Media Tbk.","SCPI":"Organon Pharma Indonesia Tbk.","SDMU":"Sidomulyo Selaras Tbk.","SDPC":"Millennium Pharmacon Internati","SDRA":"Bank Woori Saudara Indonesia 1","SGRO":"Sampoerna Agro Tbk.","SHID":"Hotel Sahid Jaya International","SIDO":"Industri Jamu dan Farmasi Sido","SILO":"Siloam International Hospitals","SIMA":"Siwani Makmur Tbk","SIMP":"Salim Ivomas Pratama Tbk.","SIPD":"Sreeya Sewu Indonesia Tbk.","SKBM":"Sekar Bumi Tbk.","SKLT":"Sekar Laut Tbk.","SKYB":"Northcliff Citranusa Indonesia","SMAR":"Smart Tbk.","SMBR":"Semen Baturaja Tbk.","SMCB":"Solusi Bangun Indonesia Tbk.","SMDM":"Suryamas Dutamakmur Tbk.","SMDR":"Samudera Indonesia  Tbk.","SMGR":"Semen Indonesia (Persero) Tbk.","SMMA":"Sinarmas Multiartha Tbk.","SMMT":"Golden Eagle Energy Tbk.","SMRA":"Summarecon Agung Tbk.","SMRU":"SMR Utama Tbk.","SMSM":"Selamat Sempurna Tbk.","SOCI":"Soechi Lines Tbk.","SONA":"Sona Topas Tourism Industry Tb","SPMA":"Suparma Tbk.","SQMI":"Wilton Makmur Indonesia Tbk.","SRAJ":"Sejahteraraya Anugrahjaya Tbk.","SRIL":"Sri Rejeki Isman Tbk.","SRSN":"Indo Acidatama Tbk","SRTG":"Saratoga Investama Sedaya Tbk.","SSIA":"Surya Semesta Internusa Tbk.","SSMS":"Sawit Sumbermas Sarana Tbk.","SSTM":"Sunson Textile Manufacture Tbk","STAR":"Buana Artha Anugerah Tbk.","STTP":"Siantar Top Tbk.","SUGI":"Sugih Energy Tbk.","SULI":"SLJ Global Tbk.","SUPR":"Solusi Tunas Pratama Tbk.","TALF":"Tunas Alfin Tbk.","TARA":"Agung Semesta Sejahtera Tbk.","TAXI":"Express Transindo Utama Tbk.","TBIG":"Tower Bersama Infrastructure T","TBLA":"Tunas Baru Lampung Tbk.","TBMS":"Tembaga Mulia Semanan Tbk.","TCID":"Mandom Indonesia Tbk.","TELE":"Omni Inovasi Indonesia Tbk.","TFCO":"Tifico Fiber Indonesia Tbk.","TGKA":"Tigaraksa Satria Tbk.","TIFA":"KDB Tifa Finance Tbk.","TINS":"Timah Tbk.","TIRA":"Tira Austenite Tbk","TIRT":"Tirta Mahakam Resources Tbk","TKIM":"Pabrik Kertas Tjiwi Kimia Tbk.","TLKM":"Telkom Indonesia (Persero) Tbk","TMAS":"Temas Tbk.","TMPO":"Tempo Intimedia Tbk.","TOBA":"TBS Energi Utama Tbk.","TOTL":"Total Bangun Persada Tbk.","TOTO":"Surya Toto Indonesia Tbk.","TOWR":"Sarana Menara Nusantara Tbk.","TPIA":"Chandra Asri Pacific Tbk.","TPMA":"Trans Power Marine Tbk.","TRAM":"Trada Alam Minera Tbk.","TRIL":"Triwira Insanlestari Tbk.","TRIM":"Trimegah Sekuritas Indonesia T","TRIO":"Trikomsel Oke Tbk.","TRIS":"Trisula International Tbk.","TRST":"Trias Sentosa Tbk.","TRUS":"Trust Finance Indonesia Tbk","TSPC":"Tempo Scan Pacific Tbk.","ULTJ":"Ultrajaya Milk Industry & Trad","UNIC":"Unggul Indah Cahaya Tbk.","UNIT":"Nusantara Inti Corpora Tbk","UNSP":"Bakrie Sumatera Plantations Tb","UNTR":"United Tractors Tbk.","UNVR":"Unilever Indonesia Tbk.","VICO":"Victoria Investama Tbk.","VINS":"Victoria Insurance Tbk.","VIVA":"Visi Media Asia Tbk.","VOKS":"Voksel Electric Tbk.","VRNA":"Mizuho Leasing Indonesia Tbk.","WAPO":"Wahana Pronatural Tbk.","WEHA":"WEHA Transportasi Indonesia Tb","WICO":"Wicaksana Overseas Internation","WIIM":"Wismilak Inti Makmur Tbk.","WIKA":"Wijaya Karya (Persero) Tbk.","WINS":"Wintermar Offshore Marine Tbk.","WOMF":"Wahana Ottomitra Multiartha Tb","WSKT":"Waskita Karya (Persero) Tbk.","WTON":"Wijaya Karya Beton Tbk.","YPAS":"Yanaprima Hastapersada Tbk","YULE":"Yulie Sekuritas Indonesia Tbk.","ZBRA":"Dosni Roha Indonesia Tbk.","SHIP":"Sillo Maritime Perdana Tbk.","CASA":"Capital Financial Indonesia Tb","DAYA":"Duta Intidaya Tbk.","DPUM":"Dua Putra Utama Makmur Tbk.","IDPR":"Indonesia Pondasi Raya Tbk.","JGLE":"Graha Andrasentra Propertindo","KINO":"Kino Indonesia Tbk.","MARI":"Mahaka Radio Integra Tbk.","MKNT":"Mitra Komunikasi Nusantara Tbk","MTRA":"Mitra Pemuda Tbk.","OASA":"Maharaksa Biru Energi Tbk.","POWR":"Cikarang Listrindo Tbk.","INCF":"Indo Komoditi Korpora Tbk.","WSBP":"Waskita Beton Precast Tbk.","PBSA":"Paramita Bangun Sarana Tbk.","PRDA":"Prodia Widyahusada Tbk.","BOGA":"Bintang Oto Global Tbk.","BRIS":"Bank Syariah Indonesia Tbk.","PORT":"Nusantara Pelabuhan Handal Tbk","CARS":"Industri dan Perdagangan Bintr","MINA":"Sanurhasta Mitra Tbk.","FORZ":"Forza Land Indonesia Tbk.","CLEO":"Sariguna Primatirta Tbk.","TAMU":"Pelayaran Tamarin Samudra Tbk.","CSIS":"Cahayasakti Investindo Sukses","TGRA":"Terregra Asia Energy Tbk.","FIRE":"Alfa Energi Investama Tbk.","TOPS":"Totalindo Eka Persada Tbk.","KMTR":"Kirana Megatara Tbk.","ARMY":"Armidian Karyatama Tbk.","MAPB":"MAP Boga Adiperkasa Tbk.","WOOD":"Integra Indocabinet Tbk.","HRTA":"Hartadinata Abadi Tbk.","MABA":"Marga Abhinaya Abadi Tbk.","HOKI":"Buyung Poetra Sembada Tbk.","MPOW":"Megapower Makmur Tbk.","MARK":"Mark Dynamics Indonesia Tbk.","NASA":"Andalan Perkasa Abadi Tbk.","MDKI":"Emdeki Utama Tbk.","BELL":"Trisula Textile Industries Tbk","KIOS":"Kioson Komersial Indonesia Tbk","GMFI":"Garuda Maintenance Facility Ae","MTWI":"Malacca Trust Wuwungan Insuran","ZINC":"Kapuas Prima Coal Tbk.","MCAS":"M Cash Integrasi Tbk.","PPRE":"PP Presisi Tbk.","WEGE":"Wijaya Karya Bangunan Gedung T","PSSI":"IMC Pelita Logistik Tbk.","MORA":"Mora Telematika Indonesia Tbk.","DWGL":"Dwi Guna Laksana Tbk.","PBID":"Panca Budi Idaman Tbk.","JMAS":"Asuransi Jiwa Syariah Jasa Mit","CAMP":"Campina Ice Cream Industry Tbk","IPCM":"Jasa Armada Indonesia Tbk.","PCAR":"Prima Cakrawala Abadi Tbk.","LCKM":"LCK Global Kedaton Tbk.","BOSS":"Borneo Olah Sarana Sukses Tbk.","HELI":"Jaya Trishindo Tbk.","JSKY":"Sky Energy Indonesia Tbk.","INPS":"Indah Prakasa Sentosa Tbk.","GHON":"Gihon Telekomunikasi Indonesia","TDPM":"Tianrong Chemicals Industry Tb","DFAM":"Dafam Property Indonesia Tbk.","NICK":"Charnic Capital Tbk.","BTPS":"Bank BTPN Syariah Tbk.","SPTO":"Surya Pertiwi Tbk.","PRIM":"Royal Prima Tbk.","HEAL":"Medikaloka Hermina Tbk.","TRUK":"Guna Timur Raya Tbk.","PZZA":"Sarimelati Kencana Tbk.","TUGU":"Asuransi Tugu Pratama Indonesi","MSIN":"MNC Digital Entertainment Tbk.","SWAT":"Sriwahana Adityakarta Tbk.","KPAL":"Steadfast Marine Tbk.","TNCA":"Trimuda Nuansa Citra Tbk.","MAPA":"Map Aktif Adiperkasa Tbk.","TCPI":"Transcoal Pacific Tbk.","IPCC":"Indonesia Kendaraan Terminal T","RISE":"Jaya Sukses Makmur Sentosa Tbk","BPTR":"Batavia Prosperindo Trans Tbk.","POLL":"Pollux Properties Indonesia Tb","NFCX":"NFC Indonesia Tbk.","MGRO":"Mahkota Group Tbk.","NUSA":"Sinergi Megah Internusa Tbk.","FILM":"MD Entertainment Tbk.","ANDI":"Andira Agro Tbk.","LAND":"Trimitra Propertindo Tbk.","MOLI":"Madusari Murni Indah Tbk.","PANI":"Pantai Indah Kapuk Dua Tbk.","DIGI":"Arkadia Digital Media Tbk.","CITY":"Natura City Developments Tbk.","SAPX":"Satria Antaran Prima Tbk.","KPAS":"Cottonindo Ariesta Tbk.","SURE":"Super Energy Tbk.","HKMU":"HK Metals Utama Tbk.","MPRO":"Maha Properti Indonesia Tbk.","DUCK":"Jaya Bersama Indo Tbk.","GOOD":"Garudafood Putra Putri Jaya Tb","SKRN":"Superkrane Mitra Utama Tbk.","YELO":"Yelooo Integra Datanet Tbk.","CAKK":"Cahayaputra Asa Keramik Tbk.","SATU":"Kota Satu Properti Tbk.","ZONE":"Mega Perintis Tbk.","PEHA":"Phapros Tbk.","FOOD":"Sentra Food Indonesia Tbk.","BEEF":"Estika Tata Tiara Tbk.","POLI":"Pollux Hotels Group Tbk.","CLAY":"Citra Putra Realty Tbk.","NATO":"Surya Permata Andalan Tbk.","JAYA":"Armada Berjaya Trans Tbk.","COCO":"Wahana Interfood Nusantara Tbk","MTPS":"Meta Epsi Tbk.","CPRI":"Capri Nusa Satu Properti Tbk.","HRME":"Menteng Heritage Realty Tbk.","POSA":"Bliss Properti Indonesia Tbk.","JAST":"Jasnita Telekomindo Tbk.","FITT":"Hotel Fitra International Tbk.","BOLA":"Bali Bintang Sejahtera Tbk.","CCSI":"Communication Cable Systems In","SFAN":"Surya Fajar Capital Tbk.","POLU":"Golden Flower Tbk.","KJEN":"Krida Jaringan Nusantara Tbk.","KAYU":"Darmi Bersaudara Tbk.","ITIC":"Indonesian Tobacco Tbk.","PAMG":"Bima Sakti Pertiwi Tbk.","IPTV":"MNC Vision Networks Tbk.","BLUE":"Berkah Prima Perkasa Tbk.","ENVY":"Envy Technologies Indonesia Tb","EAST":"Eastparc Hotel Tbk.","LIFE":"MSIG Life Insurance Indonesia","FUJI":"Fuji Finance Indonesia Tbk.","KOTA":"DMS Propertindo Tbk.","INOV":"Inocycle Technology Group Tbk.","ARKA":"Arkha Jayanti Persada Tbk.","SMKL":"Satyamitra Kemas Lestari Tbk.","HDIT":"Hensel Davest Indonesia Tbk.","KEEN":"Kencana Energi Lestari Tbk.","BAPI":"Bhakti Agung Propertindo Tbk.","TFAS":"Telefast Indonesia Tbk.","GGRP":"Gunung Raja Paksi Tbk.","OPMS":"Optima Prima Metal Sinergi Tbk","NZIA":"Nusantara Almazia Tbk.","SLIS":"Gaya Abadi Sempurna Tbk.","PURE":"Trinitan Metals and Minerals T","IRRA":"Itama Ranoraya Tbk.","DMMX":"Digital Mediatama Maxima Tbk.","SINI":"Singaraja Putra Tbk.","WOWS":"Ginting Jaya Energi Tbk.","ESIP":"Sinergi Inti Plastindo Tbk.","TEBE":"Dana Brata Luhur Tbk.","KEJU":"Mulia Boga Raya Tbk.","PSGO":"Palma Serasih Tbk.","AGAR":"Asia Sejahtera Mina Tbk.","IFSH":"Ifishdeco Tbk.","REAL":"Repower Asia Indonesia Tbk.","IFII":"Indonesia Fibreboard Industry","PMJS":"Putra Mandiri Jembar Tbk.","UCID":"Uni-Charm Indonesia Tbk.","GLVA":"Galva Technologies Tbk.","PGJO":"Tourindo Guide Indonesia Tbk.","AMAR":"Bank Amar Indonesia Tbk.","CSRA":"Cisadane Sawit Raya Tbk.","INDO":"Royalindo Investa Wijaya Tbk.","AMOR":"Ashmore Asset Management Indon","TRIN":"Perintis Triniti Properti Tbk.","DMND":"Diamond Food Indonesia Tbk.","PURA":"Putra Rajawali Kencana Tbk.","PTPW":"Pratama Widya Tbk.","TAMA":"Lancartama Sejati Tbk.","IKAN":"Era Mandiri Cemerlang Tbk.","AYLS":"Agro Yasa Lestari Tbk.","DADA":"Diamond Citra Propertindo Tbk.","ASPI":"Andalan Sakti Primaindo Tbk.","ESTA":"Esta Multi Usaha Tbk.","BESS":"Batulicin Nusantara Maritim Tb","CSMI":"Cipta Selera Murni Tbk.","BBSS":"Bumi Benowo Sukses Sejahtera T","BHAT":"Bhakti Multi Artha Tbk.","CASH":"Cashlez Worldwide Indonesia Tb","TECH":"Indosterling Technomedia Tbk.","EPAC":"Megalestari Epack Sentosaraya","UANG":"Pakuan Tbk.","PGUN":"Pradiksi Gunatama Tbk.","SOFA":"Boston Furniture Industries Tb","PPGL":"Prima Globalindo Logistik Tbk.","TOYS":"Sunindo Adipersada Tbk.","SGER":"Sumber Global Energy Tbk.","TRJA":"Transkon Jaya Tbk.","PNGO":"Pinago Utama Tbk.","SCNP":"Selaras Citra Nusantara Perkas","BBSI":"Krom Bank Indonesia Tbk.","KMDS":"Kurniamitra Duta Sentosa Tbk.","PURI":"Puri Global Sukses Tbk.","SOHO":"Soho Global Health Tbk.","HOMI":"Grand House Mulia Tbk.","ROCK":"Rockfields Properti Indonesia","ENZO":"Morenzo Abadi Perkasa Tbk.","PLAN":"Planet Properindo Jaya Tbk.","PTDU":"Djasa Ubersakti Tbk.","ATAP":"Trimitra Prawara Goldland Tbk.","VICI":"Victoria Care Indonesia Tbk.","PMMP":"Panca Mitra Multiperdana Tbk.","WIFI":"Solusi Sinergi Digital Tbk.","FAPA":"FAP Agri Tbk.","DCII":"DCI Indonesia Tbk.","KETR":"Ketrosden Triasmitra Tbk.","DGNS":"Diagnos Laboratorium Utama Tbk","UFOE":"Damai Sejahtera Abadi Tbk.","BANK":"Bank Aladin Syariah Tbk.","WMUU":"Widodo Makmur Unggas Tbk.","EDGE":"Indointernet Tbk.","UNIQ":"Ulima Nitra Tbk.","BEBS":"Berkah Beton Sadaya Tbk.","SNLK":"Sunter Lakeside Hotel Tbk.","ZYRX":"Zyrexindo Mandiri Buana Tbk.","LFLO":"Imago Mulia Persada Tbk.","FIMP":"Fimperkasa Utama Tbk.","TAPG":"Triputra Agro Persada Tbk.","NPGF":"Nusa Palapa Gemilang Tbk.","LUCY":"Lima Dua Lima Tiga Tbk.","ADCP":"Adhi Commuter Properti Tbk.","HOPE":"Harapan Duta Pertiwi Tbk.","MGLV":"Panca Anugrah Wisesa Tbk.","TRUE":"Triniti Dinamik Tbk.","LABA":"Green Power Group Tbk.","ARCI":"Archi Indonesia Tbk.","IPAC":"Era Graharealty Tbk.","MASB":"Bank Multiarta Sentosa Tbk.","BMHS":"Bundamedik Tbk.","FLMC":"Falmaco Nonwoven Industri Tbk.","NICL":"PAM Mineral Tbk.","UVCR":"Trimegah Karya Pratama Tbk.","BUKA":"Bukalapak.com Tbk.","HAIS":"Hasnur Internasional Shipping","OILS":"Indo Oil Perkasa Tbk.","GPSO":"Geoprima Solusi Tbk.","MCOL":"Prima Andalan Mandiri Tbk.","RSGK":"Kedoya Adyaraya Tbk.","RUNS":"Global Sukses Solusi Tbk.","SBMA":"Surya Biru Murni Acetylene Tbk","CMNT":"Cemindo Gemilang Tbk.","GTSI":"GTS Internasional Tbk.","IDEA":"Idea Indonesia Akademi Tbk.","KUAS":"Ace Oldfields Tbk.","BOBA":"Formosa Ingredient Factory Tbk","MTEL":"Dayamitra Telekomunikasi Tbk.","DEPO":"Caturkarda Depo Bangunan Tbk.","BINO":"Perma Plasindo Tbk.","CMRY":"Cisarua Mountain Dairy Tbk.","WGSH":"Wira Global Solusi Tbk.","TAYS":"Jaya Swarasa Agung Tbk.","WMPP":"Widodo Makmur Perkasa Tbk.","RMKE":"RMK Energy Tbk.","OBMD":"OBM Drilchem Tbk.","AVIA":"Avia Avian Tbk.","IPPE":"Indo Pureco Pratama Tbk.","NASI":"Wahana Inti Makmur Tbk.","BSML":"Bintang Samudera Mandiri Lines","DRMA":"Dharma Polimetal Tbk.","ADMR":"Adaro Minerals Indonesia Tbk.","SEMA":"Semacom Integrated Tbk.","ASLC":"Autopedia Sukses Lestari Tbk.","NETV":"MDTV Media Technologies Tbk.","BAUT":"Mitra Angkasa Sejahtera Tbk.","ENAK":"Champ Resto Indonesia Tbk.","NTBK":"Nusatama Berkah Tbk.","SMKM":"Sumber Mas Konstruksi Tbk.","STAA":"Sumber Tani Agung Resources Tb","NANO":"Nanotech Indonesia Global Tbk.","BIKE":"Sepeda Bersama Indonesia Tbk.","WIRG":"WIR ASIA Tbk.","SICO":"Sigma Energy Compressindo Tbk.","GOTO":"GoTo Gojek Tokopedia Tbk.","TLDN":"Teladan Prima Agro Tbk.","MTMH":"Murni Sadar Tbk.","WINR":"Winner Nusantara Jaya Tbk.","IBOS":"Indo Boga Sukses Tbk.","OLIV":"Oscar Mitra Sukses Sejahtera T","ASHA":"Cilacap Samudera Fishing Indus","SWID":"Saraswanti Indoland Developmen","TRGU":"Cerestar Indonesia Tbk.","ARKO":"Arkora Hydro Tbk.","CHEM":"Chemstar Indonesia Tbk.","DEWI":"Dewi Shri Farmindo Tbk.","AXIO":"Tera Data Indonusa Tbk.","KRYA":"Bangun Karya Perkasa Jaya Tbk.","HATM":"Habco Trans Maritima Tbk.","RCCC":"Utama Radar Cahaya Tbk.","GULA":"Aman Agrindo Tbk.","JARR":"Jhonlin Agro Raya Tbk.","AMMS":"Agung Menjangan Mas Tbk.","RAFI":"Sari Kreasi Boga Tbk.","KKES":"Kusuma Kemindo Sentosa Tbk.","ELPI":"Pelayaran Nasional Ekalya Purn","EURO":"Estee Gold Feet Tbk.","KLIN":"Klinko Karya Imaji Tbk.","TOOL":"Rohartindo Nusantara Luas Tbk.","BUAH":"Segar Kumala Indonesia Tbk.","CRAB":"Toba Surimi Industries Tbk.","MEDS":"Hetzer Medical Indonesia Tbk.","COAL":"Black Diamond Resources Tbk.","PRAY":"Famon Awal Bros Sedaya Tbk.","CBUT":"Citra Borneo Utama Tbk.","BELI":"Global Digital Niaga Tbk.","MKTR":"Menthobi Karyatama Raya Tbk.","OMED":"Jayamas Medica Industri Tbk.","BSBK":"Wulandari Bangun Laksana Tbk.","PDPP":"Primadaya Plastisindo Tbk.","KDTN":"Puri Sentul Permai Tbk.","ZATA":"Bersama Zatta Jaya Tbk.","NINE":"Techno9 Indonesia Tbk.","MMIX":"Multi Medika Internasional Tbk","PADA":"Personel Alih Daya Tbk.","ISAP":"Isra Presisi Indonesia Tbk.","VTNY":"Venteny Fortuna International","SOUL":"Mitra Tirta Buwana Tbk.","ELIT":"Data Sinergitama Jaya Tbk.","BEER":"Jobubu Jarum Minahasa Tbk.","CBPE":"Citra Buana Prasida Tbk.","SUNI":"Sunindo Pratama Tbk.","CBRE":"Cakra Buana Resources Energi T","WINE":"Hatten Bali Tbk.","BMBL":"Lavender Bina Cendikia Tbk.","PEVE":"Penta Valent Tbk.","LAJU":"Jasa Berdikari Logistics Tbk.","FWCT":"Wijaya Cahaya Timber Tbk.","NAYZ":"Hassana Boga Sejahtera Tbk.","IRSX":"Aviana Sinar Abadi Tbk.","PACK":"Abadi Nusantara Hijau Investam","VAST":"Vastland Indonesia Tbk.","CHIP":"Pelita Teknologi Global Tbk.","HALO":"Haloni Jane Tbk.","KING":"Hoffmen Cleanindo Tbk.","PGEO":"Pertamina Geothermal Energy Tb","FUTR":"Lini Imaji Kreasi Ekosistem Tb","HILL":"Hillcon Tbk.","BDKR":"Berdikari Pondasi Perkasa Tbk.","PTMP":"Mitra Pack Tbk.","SAGE":"Saptausaha Gemilangindah Tbk.","TRON":"Teknologi Karya Digital Nusa T","CUAN":"Petrindo Jaya Kreasi Tbk.","NSSS":"Nusantara Sawit Sejahtera Tbk.","GTRA":"Grahaprima Suksesmandiri Tbk.","HAJJ":"Arsy Buana Travelindo Tbk.","PIPA":"Multi Makmur Lemindo Tbk.","NCKL":"Trimegah Bangun Persada Tbk.","MENN":"Menn Teknologi Indonesia Tbk.","AWAN":"Era Digital Media Tbk.","MBMA":"Merdeka Battery Materials Tbk.","RAAM":"Tripar Multivision Plus Tbk.","DOOH":"Era Media Sejahtera Tbk.","JATI":"Informasi Teknologi Indonesia","TYRE":"King Tire Indonesia Tbk.","MPXL":"MPX Logistics International Tb","SMIL":"Sarana Mitra Luas Tbk.","KLAS":"Pelayaran Kurnia Lautan Semest","MAXI":"Maxindo Karya Anugerah Tbk.","VKTR":"VKTR Teknologi Mobilitas Tbk.","RELF":"Graha Mitra Asia Tbk.","AMMN":"Amman Mineral Internasional Tb","CRSN":"Carsurin Tbk.","GRPM":"Graha Prima Mentari Tbk.","WIDI":"Widiant Jaya Krenindo Tbk.","TGUK":"Platinum Wahab Nusantara Tbk.","INET":"Sinergi Inti Andalan Prima Tbk","MAHA":"Mandiri Herindo Adiperkasa Tbk","RMKO":"Royaltama Mulia Kontraktorindo","CNMA":"Nusantara Sejahtera Raya Tbk.","FOLK":"Multi Garam Utama Tbk.","HBAT":"Minahasa Membangun Hebat Tbk.","GRIA":"Ingria Pratama Capitalindo Tbk","PPRI":"Paperocks Indonesia Tbk.","ERAL":"Sinar Eka Selaras Tbk.","CYBR":"ITSEC Asia Tbk.","MUTU":"Mutuagung Lestari Tbk.","LMAX":"Lupromax Pelumas Indonesia Tbk","HUMI":"Humpuss Maritim Internasional","MSIE":"Multisarana Intan Eduka Tbk.","RSCH":"Charlie Hospital Semarang Tbk.","BABY":"Multitrend Indo Tbk.","AEGS":"Anugerah Spareparts Sejahtera","IOTF":"Sumber Sinergi Makmur Tbk.","KOCI":"Kokoh Exa Nusantara Tbk.","PTPS":"Pulau Subur Tbk.","BREN":"Barito Renewables Energy Tbk.","STRK":"Lovina Beach Brewery Tbk.","KOKA":"Koka Indonesia Tbk.","LOPI":"Logisticsplus International Tb","UDNG":"Agro Bahari Nusantara Tbk.","RGAS":"Kian Santang Muliatama Tbk.","MSTI":"Mastersystem Infotama Tbk.","IKPM":"Ikapharmindo Putramas Tbk.","AYAM":"Janu Putra Sejahtera Tbk.","SURI":"Maja Agung Latexindo Tbk.","ASLI":"Asri Karya Lestari Tbk.","CGAS":"Citra Nusantara Gemilang Tbk.","NICE":"Adhi Kartiko Pratama Tbk.","MSJA":"Multi Spunindo Jaya Tbk.","SMLE":"Sinergi Multi Lestarindo Tbk.","ACRO":"Samcro Hyosung Adilestari Tbk.","MANG":"Manggung Polahraya Tbk.","GRPH":"Griptha Putra Persada Tbk.","SMGA":"Sumber Mineral Global Abadi Tb","UNTD":"Terang Dunia Internusa Tbk.","TOSK":"Topindo Solusi Komunika Tbk.","MPIX":"Mitra Pedagang Indonesia Tbk.","ALII":"Ancara Logistics Indonesia Tbk","MKAP":"Multikarya Asia Pasifik Raya T","MEJA":"Harta Djaya Karya Tbk.","LIVE":"Homeco Victoria Makmur Tbk.","HYGN":"Ecocare Indo Pasifik Tbk.","BAIK":"Bersama Mencapai Puncak Tbk.","VISI":"Satu Visi Putra Tbk.","AREA":"Dunia Virtual Online Tbk.","MHKI":"Multi Hanna Kreasindo Tbk.","ATLA":"Atlantis Subsea Indonesia Tbk.","DATA":"Remala Abadi Tbk.","SOLA":"Xolare RCR Energy Tbk.","BATR":"Benteng Api Technic Tbk.","SPRE":"Soraya Berjaya Indonesia Tbk.","PART":"Cipta Perdana Lancar Tbk.","GOLF":"Intra Golflink Resorts Tbk.","ISEA":"Indo American Seafoods Tbk.","BLES":"Superior Prima Sukses Tbk.","GUNA":"Gunanusa Eramandiri Tbk.","LABS":"UBC Medical Indonesia Tbk.","DOSS":"Global Sukses Digital Tbk.","NEST":"Esta Indonesia Tbk.","PTMR":"Master Print Tbk.","VERN":"Verona Indah Pictures Tbk.","DAAZ":"Daaz Bara Lestari Tbk.","BOAT":"Newport Marine Services Tbk.","NAIK":"Adiwarna Anugerah Abadi Tbk.","AADI":"Adaro Andalan Indonesia Tbk.","MDIY":"Daya Intiguna Yasa Tbk.","KSIX":"Kentanix Supra International T","RATU":"Raharja Energi Cepu Tbk.","YOII":"Asuransi Digital Bersama Tbk.","HGII":"Hero Global Investment Tbk.","BRRC":"Raja Roti Cemerlang Tbk.","DGWG":"Delta Giri Wacana Tbk.","CBDK":"Bangun Kosambi Sukses Tbk.","OBAT":"Brigit Biofarmaka Teknologi Tb","SOSS":"Shield On Service Tbk.","DEAL":"Dewata Freightinternational Tb","POLA":"Pool Advista Finance Tbk.","DIVA":"Distribusi Voucher Nusantara T","LUCK":"Sentral Mitra Informatika Tbk.","URBN":"Urban Jakarta Propertindo Tbk.","SOTS":"Satria Mega Kencana Tbk.","AMAN":"Makmur Berkah Amanda Tbk.","CARE":"Metro Healthcare Indonesia Tbk","SAMF":"Saraswanti Anugerah Makmur Tbk","SBAT":"Sejahtera Bintang Abadi Textil","KBAG":"Karya Bersama Anugerah Tbk.","CBMF":"Cahaya Bintang Medan Tbk.","RONY":"Aesler Grup Internasional Tbk."};

// nama yang terpotong 30 karakter di sumber data — perbaiki yang paling sering dipakai
Object.assign(IDX_STOCKS, {
  BBRI:"Bank Rakyat Indonesia (Persero) Tbk.", BBNI:"Bank Negara Indonesia (Persero) Tbk.",
  TLKM:"Telkom Indonesia (Persero) Tbk.", GIAA:"Garuda Indonesia (Persero) Tbk.",
  ADRO:"Alamtri Resources Indonesia Tbk.", AMMN:"Amman Mineral Internasional Tbk.",
  BJBR:"Bank Pembangunan Daerah Jawa Barat & Banten Tbk.", BJTM:"Bank Pembangunan Daerah Jawa Timur Tbk.",
  CPIN:"Charoen Pokphand Indonesia Tbk.", ICBP:"Indofood CBP Sukses Makmur Tbk.",
  INTP:"Indocement Tunggal Prakarsa Tbk.", ITMG:"Indo Tambangraya Megah Tbk.",
  MEDC:"Medco Energi Internasional Tbk.", PGEO:"Pertamina Geothermal Energy Tbk.",
  TBIG:"Tower Bersama Infrastructure Tbk.", SIDO:"Industri Jamu dan Farmasi Sido Muncul Tbk.",
  SILO:"Siloam International Hospitals Tbk.", ISSP:"Steel Pipe Industry of Indonesia Tbk.",
  ULTJ:"Ultrajaya Milk Industry & Trading Company Tbk.", LSIP:"PP London Sumatra Indonesia Tbk."
});
function initTickerList(){
  const dl = document.createElement('datalist'); dl.id = 'idxList';
  const frag = document.createDocumentFragment();
  const seen = new Set(Object.keys(IDX_STOCKS));
  for(const [c,n] of Object.entries(IDX_STOCKS)){
    const o = document.createElement('option'); o.value = c; o.textContent = n; frag.appendChild(o);
  }
  for(const t of Object.keys(history||{})){ // ticker dari riwayat yang belum ada di daftar
    if(!seen.has(t)){ const o = document.createElement('option'); o.value = t; frag.appendChild(o); }
  }
  dl.appendChild(frag); document.body.appendChild(dl);
}
function normTicker(v){
  v = (v||'').toUpperCase().trim();
  const m = v.match(/^[A-Z]{4}/);
  return m ? m[0] : v.replace(/[^A-Z0-9]/g,'');
}
function stockName(code){ return IDX_STOCKS[code] || ''; }

/* ---------- Peta broker default ---------- */
const DEFAULT_MAP = {
  BK:['J.P. Morgan Sekuritas','ASING'], KZ:['CLSA Sekuritas','ASING'], AK:['UBS Sekuritas','ASING'],
  CS:['Credit Suisse Sekuritas','ASING'], RX:['Macquarie Sekuritas','ASING'], ZP:['Maybank Sekuritas','ASING'],
  YU:['CGS International Sekuritas','ASING'], DB:['Deutsche Sekuritas','ASING'], MS:['Morgan Stanley Sekuritas','ASING'],
  CG:['Citigroup Sekuritas','ASING'], BW:['BNP Paribas Sekuritas','ASING'], AI:['UOB Kay Hian Sekuritas','ASING'],
  DR:['RHB Sekuritas','ASING'],
  CC:['Mandiri Sekuritas','INSTITUSI'], NI:['BNI Sekuritas','INSTITUSI'], OD:['BRI Danareksa Sekuritas','INSTITUSI'],
  DX:['Bahana Sekuritas','INSTITUSI'], SQ:['BCA Sekuritas','INSTITUSI'], LG:['Trimegah Sekuritas','INSTITUSI'],
  AZ:['Sucor Sekuritas','INSTITUSI'], IF:['Samuel Sekuritas','INSTITUSI'],
  YP:['Mirae Asset Sekuritas','RITEL'], PD:['Indo Premier Sekuritas','RITEL'], XC:['Ajaib Sekuritas','RITEL'],
  XL:['Stockbit Sekuritas','RITEL'], KK:['Phillip Sekuritas','RITEL'], CP:['Valbury Sekuritas','RITEL'],
  GR:['Panin Sekuritas','RITEL'], EP:['MNC Sekuritas','RITEL'], SF:['Surya Fajar Sekuritas','RITEL']
};
const CATS = {ASING:'Asing', INSTITUSI:'Institusi Lokal', RITEL:'Ritel', LAINNYA:'Lainnya'};
const CATCOLOR = {ASING:'var(--violet)', INSTITUSI:'var(--aqua)', RITEL:'var(--yellow)', LAINNYA:'var(--muted)'};

function loadMap(){
  try{ const m = JSON.parse(localStorage.getItem('bdm_map')); if(m && typeof m==='object') return m; }catch(e){}
  return structuredClone(DEFAULT_MAP);
}
let brokerMap = loadMap();
const saveMap = ()=> localStorage.setItem('bdm_map', JSON.stringify(brokerMap));
const catOf = code => (brokerMap[code]||[])[1] || 'LAINNYA';
const nameOf = code => (brokerMap[code]||[])[0] || '';

function renderMap(){
  const tb = $('#mapRows'); tb.innerHTML='';
  const order = {ASING:0, INSTITUSI:1, RITEL:2, LAINNYA:3};
  Object.entries(brokerMap).sort((a,b)=> (order[a[1][1]]-order[b[1][1]]) || a[0].localeCompare(b[0]))
  .forEach(([code,[name,cat]])=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><b>${code}</b></td><td>${name}</td>
      <td><span class="chip"><span class="dot" style="background:${CATCOLOR[cat]}"></span>
        <select data-code="${code}" style="width:150px">
          ${Object.entries(CATS).map(([k,v])=>`<option value="${k}" ${k===cat?'selected':''}>${v}</option>`).join('')}
        </select></span></td>
      <td><button class="btn small danger" data-del="${code}">Hapus</button></td>`;
    tb.appendChild(tr);
  });
}
$('#mapRows').addEventListener('change', e=>{
  const s = e.target.closest('select[data-code]'); if(!s) return;
  brokerMap[s.dataset.code][1] = s.value; saveMap(); renderMap();
});
$('#mapRows').addEventListener('click', e=>{
  const b = e.target.closest('button[data-del]'); if(!b) return;
  delete brokerMap[b.dataset.del]; saveMap(); renderMap();
});
$('#btnMapAdd').onclick = ()=>{
  const code = $('#mapNewCode').value.trim().toUpperCase();
  if(!/^[A-Z0-9]{2,3}$/.test(code)) return alert('Kode broker harus 2–3 huruf/angka, mis. ZP');
  brokerMap[code] = [$('#mapNewName').value.trim()||'-', $('#mapNewCat').value];
  saveMap(); renderMap(); $('#mapNewCode').value=''; $('#mapNewName').value='';
};
$('#btnMapReset').onclick = ()=>{
  if(confirm('Kembalikan peta broker ke default? Perubahan Anda akan hilang.')){
    brokerMap = structuredClone(DEFAULT_MAP); saveMap(); renderMap();
  }
};
renderMap();

/* ---------- Format angka ---------- */
const idn = (v,d=1)=> v.toLocaleString('id-ID',{maximumFractionDigits:d});
function fmtRp(v){
  const a=Math.abs(v), s=v<0?'−':'';
  if(a>=1e12) return s+'Rp '+idn(a/1e12,2)+' T';
  if(a>=1e9)  return s+'Rp '+idn(a/1e9,1)+' M';
  if(a>=1e6)  return s+'Rp '+idn(a/1e6,1)+' jt';
  if(a>=1e3)  return s+'Rp '+idn(a/1e3,1)+' rb';
  return s+'Rp '+idn(a,0);
}
const fmtPct = v => (v>0?'+':v<0?'−':'')+idn(Math.abs(v),2)+'%';

/* ---------- Parser broker summary ---------- */
function parseNumToken(tok, mMean){
  tok = tok.trim().toUpperCase().replace(/^RP\.?/,'').trim();
  const m = tok.match(/^([+-]?[\d.,]+)\s*(JT|RB|[KMBT])?$/);
  if(!m) return null;
  let num = m[1]; const suf = m[2];
  // tentukan pemisah desimal: pemisah TERAKHIR dianggap desimal jika grup akhirnya bukan 3 digit
  const lastSep = Math.max(num.lastIndexOf('.'), num.lastIndexOf(','));
  let val;
  if(lastSep === -1){ val = parseFloat(num); }
  else{
    const tail = num.slice(lastSep+1);
    const isDecimal = suf ? true : (tail.length !== 3);
    if(isDecimal){
      const intPart = num.slice(0,lastSep).replace(/[.,]/g,'');
      val = parseFloat(intPart + '.' + tail);
    } else {
      val = parseFloat(num.replace(/[.,]/g,''));
    }
  }
  if(!isFinite(val)) return null;
  const mult = {K:1e3, RB:1e3, JT:1e6, M:mMean, B:1e9, T:1e12}[suf] || 1;
  return {val: val*mult, hadSuffix: !!suf};
}
function parseSide(text, unit, mMean){
  const rows = [];
  for(let raw of text.split(/\r?\n/)){
    let line = raw.trim();
    if(!line) continue;
    let toks;
    if(line.includes('\t')) toks = line.split(/\t+/);
    else if(line.includes(';')) toks = line.split(/;+/);
    else if(line.includes(',') && !/\s/.test(line)) toks = line.split(/,+/);
    else toks = line.split(/\s+/);
    toks = toks.map(t=>t.trim()).filter(Boolean);
    if(!toks.length) continue;
    const code = toks[0].toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(!/^[A-Z]{2}[A-Z0-9]?$/.test(code)) continue; // lewati header/baris tak dikenal
    const nums = [];
    for(let i=1;i<toks.length;i++){
      const p = parseNumToken(toks[i], mMean);
      if(p) nums.push(p);
    }
    if(!nums.length) continue;
    let lot=null, val=null, avg=null;
    if(nums.length===1){ val = nums[0]; }
    else if(nums.length===2){ lot = nums[0].val; val = nums[1]; }
    else { lot = nums[0].val; val = nums[1]; avg = nums[2].val; }
    let v = val.val * (val.hadSuffix ? 1 : unit);
    rows.push({code, lot, val:v, avg});
  }
  return rows;
}

/* ---------- Analisis ---------- */
let lastResult = null;

// mesin skor murni — dipakai analisis harian (tab Analisis) & multi-hari
function computeDay(brokersIn, prev, close){
  const brokers = brokersIn.map(b=>({...b, net:(b.buy||0)-(b.sell||0), cat:catOf(b.code)}));
  const sumBuy = brokers.reduce((s,b)=>s+(b.buy||0),0);
  const sumSell = brokers.reduce((s,b)=>s+(b.sell||0),0);
  const totalVal = Math.max(sumBuy, sumSell) || 1;
  const imbalance = Math.abs(sumBuy-sumSell)/totalVal;
  const catNet = {ASING:0, INSTITUSI:0, RITEL:0, LAINNYA:0};
  for(const b of brokers) catNet[b.cat] += b.net;
  const netBuyers = brokers.filter(b=>b.net>0).sort((a,b)=>b.net-a.net);
  const netSellers = brokers.filter(b=>b.net<0).sort((a,b)=>a.net-b.net);
  const top3Buy = netBuyers.slice(0,3).reduce((s,b)=>s+b.net,0);
  const top3Sell = Math.abs(netSellers.slice(0,3).reduce((s,b)=>s+b.net,0));
  const BC = top3Buy/totalVal, SC = top3Sell/totalVal, D = BC - SC;
  const smart = catNet.ASING + catNet.INSTITUSI;
  const F = smart/totalVal, R = -catNet.RITEL/totalVal;
  const priceChg = prev>0 ? (close-prev)/prev*100 : 0;
  const bigForeignSell = catNet.ASING < -0.02*totalVal;
  const resilience = (bigForeignSell && priceChg > -1) ? 8 : 0;
  const mdPenalty = priceChg < -4 ? -8 : 0;
  let score = Math.round(50 + 90*D + 60*F + 25*R + resilience + mdPenalty);
  score = Math.max(0, Math.min(100, score));
  let phase, phaseDesc, phaseIcon, phaseColor;
  const retailFomo = catNet.RITEL > 0.05*totalVal;
  if(score>=62 && priceChg<=3){
    phase='AKUMULASI'; phaseIcon='▲'; phaseColor='var(--good)';
    phaseDesc='Barang berpindah ke sedikit tangan (strong hands) di harga bawah. Strategi lazim: Buy on Weakness bertahap di area support, stop-loss disiplin.';
  } else if(priceChg>3 && score>=48){
    phase = retailFomo ? 'MARK-UP (euforia ritel)' : 'MARK-UP';
    phaseIcon='↗'; phaseColor='var(--blue)';
    phaseDesc= retailFomo
      ? 'Harga naik kencang dan ritel mulai dominan membeli — waspada, fase distribusi bisa menyusul. Amankan sebagian profit / trailing stop.'
      : 'Harga dinaikkan dengan volume — momentum aktif. Ikut tren dengan trailing stop; hindari beli saat kejar harga terlalu jauh dari support.';
  } else if(score<=38 && priceChg>=-3){
    phase='DISTRIBUSI'; phaseIcon='▼'; phaseColor='var(--serious)';
    phaseDesc='Sedikit broker besar melepas barang ke banyak pembeli kecil. Kurangi posisi; hindari akumulasi baru sampai pola berubah.';
  } else if(priceChg<-3 && score<=50){
    phase='MARK-DOWN'; phaseIcon='↘'; phaseColor='var(--critical)';
    phaseDesc='Dukungan beli hilang, harga dilepas turun. Hindari menangkap pisau jatuh; tunggu stabilisasi dan jejak akumulasi baru.';
  } else {
    phase='NETRAL / TRANSISI'; phaseIcon='•'; phaseColor='var(--muted)';
    phaseDesc='Belum ada dominasi jelas. Pantau konsentrasi broker & aliran kategori beberapa hari beruntun untuk konfirmasi.';
  }
  return {brokers, sumBuy, sumSell, totalVal, imbalance, catNet, netBuyers, netSellers,
    BC, SC, priceChg, score, phase, phaseDesc, phaseIcon, phaseColor, smart, bigForeignSell, retailFomo};
}

function analyze(){
  const ticker = normTicker($('#inTicker').value);
  const date = $('#inDate').value;
  const prev = parseFloat($('#inPrev').value);
  const close = parseFloat($('#inClose').value);
  const vol = parseFloat($('#inVol').value)||0;
  const avgVol = parseFloat($('#inAvgVol').value)||0;
  const unit = parseFloat($('#inUnit').value);
  const mMean = parseFloat($('#inMMean').value);
  if(!ticker) return alert('Isi kode saham dulu.');
  if(!date) return alert('Isi tanggal.');
  if(!(prev>0) || !(close>0)) return alert('Isi harga penutupan & penutupan sebelumnya.');
  const buys = parseSide($('#inBuy').value, unit, mMean);
  const sells = parseSide($('#inSell').value, unit, mMean);
  if(!buys.length || !sells.length) return alert('Data buyer/seller belum terbaca. Periksa format: KODE  LOT  NILAI  AVG per baris.');

  // gabung per broker
  const map = {};
  for(const r of buys){ (map[r.code] ??= {buy:0,sell:0,bAvg:null,sAvg:null}).buy += r.val; if(r.avg) map[r.code].bAvg=r.avg; }
  for(const r of sells){ (map[r.code] ??= {buy:0,sell:0,bAvg:null,sAvg:null}).sell += r.val; if(r.avg) map[r.code].sAvg=r.avg; }
  const brokers = Object.entries(map).map(([code,o])=>({code, ...o}));
  const day = computeDay(brokers, prev, close);
  const {totalVal, imbalance, catNet, netBuyers, netSellers, BC, SC, priceChg,
    score, phase, phaseDesc, phaseIcon, phaseColor, smart, bigForeignSell, retailFomo} = day;

  // insight
  const ins = [];
  const pctS = v => idn(v*100,1)+'%';
  if(BC>0.12 && BC > SC*1.3)
    ins.push(['🎯',`<b>Konsentrasi beli tinggi:</b> top-3 net buyer menyerap <b>${pctS(BC)}</b> dari total nilai transaksi, sementara top-3 net seller hanya ${pctS(SC)}. Suplai berpindah dari banyak pihak ke sedikit pihak — ciri khas <b>akumulasi</b>.`]);
  else if(SC>0.12 && SC > BC*1.3)
    ins.push(['⚠️',`<b>Konsentrasi jual tinggi:</b> top-3 net seller melepas <b>${pctS(SC)}</b> dari total transaksi ke pembeli yang tersebar (top-3 buyer hanya ${pctS(BC)}) — pola khas <b>distribusi</b>.`]);
  else
    ins.push(['⚖️',`Konsentrasi relatif berimbang (top-3 buyer ${pctS(BC)} vs top-3 seller ${pctS(SC)}) — belum ada pihak yang dominan.`]);

  if(bigForeignSell && priceChg>-1)
    ins.push(['🛡️',`<b>Absorpsi terdeteksi:</b> asing net sell ${fmtRp(catNet.ASING)} tetapi harga hanya bergerak ${fmtPct(priceChg)}. Tekanan jual asing diserap institusi domestik${catNet.INSTITUSI>0?` (net buy ${fmtRp(catNet.INSTITUSI)})`:''} — barang pindah dari weak hands ke strong hands.`]);
  else if(catNet.ASING>0.02*totalVal)
    ins.push(['🌏',`<b>Asing masuk:</b> net buy asing ${fmtRp(catNet.ASING)} (${pctS(catNet.ASING/totalVal)} dari nilai transaksi) — foreign inflow mendukung tren.`]);
  else if(bigForeignSell)
    ins.push(['🌏',`Asing net sell ${fmtRp(catNet.ASING)}. Perhatikan apakah ada penyerap; tanpa absorpsi, tekanan lanjutan mungkin terjadi.`]);

  if(catNet.RITEL < -0.03*totalVal)
    ins.push(['🧺',`Ritel net sell ${fmtRp(catNet.RITEL)} — publik melepas barang (sering terjadi justru di fase akumulasi institusi).`]);
  else if(retailFomo)
    ins.push(['🔥',`Ritel net buy besar (${fmtRp(catNet.RITEL)}). Jika ini terjadi setelah harga naik jauh, waspada <b>FOMO</b> — ritel sering menjadi exit liquidity institusi.`]);

  if(avgVol>0 && vol>0){
    const vr = vol/avgVol;
    if(vr>=1.5) ins.push(['📢',`Volume ${idn(vr,1)}× rata-rata — partisipasi meningkat tajam${priceChg>2?' mendukung mark-up':''}.`]);
    else if(vr<=0.6) ins.push(['🤫',`Volume hanya ${idn(vr,1)}× rata-rata — aktivitas senyap; akumulasi terselubung biasanya justru bervolume moderat/stabil.`]);
    else ins.push(['📊',`Volume ${idn(vr,1)}× rata-rata — dalam kisaran normal.`]);
  }
  if(imbalance>0.2)
    ins.push(['❗',`Total nilai sisi beli dan jual berbeda ${pctS(imbalance)} — kemungkinan data yang ditempel tidak lengkap (hanya sebagian baris). Hasil tetap dihitung, tapi periksa kembali data Anda.`]);

  // konfirmasi intraday dari tab ⏱️ Tape (bila pernah dianalisis untuk saham & tanggal yang sama)
  try{
    const tp = JSON.parse(localStorage.getItem('bdm_tape_'+ticker+'_'+date));
    if(tp) ins.push(['⏱️',`<b>Konfirmasi tape (${idn(tp.n,0)} print):</b> pola institusi ${idn(tp.instPct,1)}% volume, net aggressor institusi <b class="${tp.instDeltaLot>=0?'pos':'neg'}">${tp.instDeltaLot>=0?'BELI':'JUAL'} ${idn(Math.abs(tp.instDeltaLot),0)} lot</b> (${fmtRp(Math.abs(tp.instDeltaRp))}) · skor tape <b>${tp.score}</b> — ${tp.score>=62?'running trade mengonfirmasi akumulasi.':tp.score<=38?'running trade justru menunjukkan distribusi — hati-hati.':'running trade belum menunjukkan dominasi.'} <span class="hint">dari tab ⏱️ Tape</span>`]);
  }catch(e){}

  lastResult = {ticker, date, prev, close, vol, avgVol, priceChg, totalVal,
    catNet, BC, SC, score, phase, phaseIcon, phaseColor, phaseDesc,
    netBuyers, netSellers, insights:ins, smart, brokers: day.brokers};
  renderDash(lastResult);
  $$('#tabs button').forEach(x=>x.classList.toggle('active', x.dataset.tab==='dash'));
  $$('.panel').forEach(p=>p.classList.toggle('active', p.id==='panel-dash'));
}
$('#btnAnalyze').onclick = analyze;

function scoreLabel(s){
  if(s>=75) return ['Akumulasi kuat','var(--good)'];
  if(s>=62) return ['Akumulasi','var(--good)'];
  if(s>=48) return ['Netral','var(--muted)'];
  if(s>=38) return ['Distribusi ringan','var(--serious)'];
  return ['Distribusi kuat','var(--critical)'];
}

function renderDash(r){
  $('#dashEmpty').style.display='none';
  $('#dashBody').style.display='block';
  const [slbl, scol] = scoreLabel(r.score);
  $('#dScore').textContent = r.score;
  $('#dScore').style.color = scol;
  $('#dScoreLbl').innerHTML = `<b style="color:${scol}">${slbl}</b>`;
  $('#dMeter').style.width = r.score+'%';
  $('#dMeter').style.background = scol;
  const ph = $('#dPhase');
  ph.textContent = `${r.phaseIcon} ${r.phase}`;
  ph.style.color = r.phaseColor; ph.style.borderColor = r.phaseColor;
  $('#dPhaseDesc').textContent = r.phaseDesc;
  const sName = stockName(r.ticker);
  $('#dTickerLbl').textContent = `${r.ticker}${sName? ' · '+sName : ''} · ${r.date}`;
  $('#dPrice').innerHTML = `Rp ${idn(r.close,0)} <span style="font-size:14px" class="${r.priceChg>=0?'pos':'neg'}">${fmtPct(r.priceChg)}</span>`;
  $('#dPriceDet').textContent = `Sebelumnya Rp ${idn(r.prev,0)}${r.vol?` · Volume ${idn(r.vol/1e6,1)} jt lembar`:''} · Total transaksi ${fmtRp(r.totalVal)}`;

  const setNet = (id,v)=>{ const el=$(id); el.textContent=fmtRp(v); el.className='val '+(v>0?'pos':v<0?'neg':''); };
  setNet('#dNetF', r.catNet.ASING); setNet('#dNetI', r.catNet.INSTITUSI); setNet('#dNetR', r.catNet.RITEL);

  // bar kategori (diverging)
  const cb = $('#dCatBars'); cb.innerHTML='';
  const maxAbs = Math.max(...Object.values(r.catNet).map(Math.abs), 1);
  for(const [k,label] of Object.entries(CATS)){
    const v = r.catNet[k];
    const w = Math.abs(v)/maxAbs*50;
    const fill = v>=0
      ? `left:50%;width:${w}%;background:var(--pos)`
      : `right:50%;width:${w}%;background:var(--neg)`;
    cb.insertAdjacentHTML('beforeend', `<div class="divbar">
      <span class="chip"><span class="dot" style="background:${CATCOLOR[k]}"></span>${label}</span>
      <div class="track"><div class="zero"></div><div class="fill" style="${fill}"></div></div>
      <span class="vlab ${v>0?'pos':v<0?'neg':''}">${fmtRp(v)}</span></div>`);
  }
  $('#dConc').innerHTML =
    `Top-3 net buyer menyerap <b>${idn(r.BC*100,1)}%</b> · top-3 net seller melepas <b>${idn(r.SC*100,1)}%</b> dari total nilai transaksi.<br>
     Jumlah broker net buy: <b>${r.netBuyers.length}</b> · net sell: <b>${r.netSellers.length}</b>.
     <span class="hint">Akumulasi sehat: pembeli terpusat, penjual tersebar. Distribusi: sebaliknya.</span>`;

  const ul = $('#dInsights'); ul.innerHTML='';
  for(const [ic, html] of r.insights){
    const li = document.createElement('li'); li.dataset.ic=ic; li.innerHTML=html; ul.appendChild(li);
  }

  const rowHTML = b => `<tr><td><b>${b.code}</b> <span class="hint">${nameOf(b.code)}</span></td>
    <td><span class="chip"><span class="dot" style="background:${CATCOLOR[b.cat]}"></span>${CATS[b.cat]}</span></td>
    <td class="num ${b.net>0?'pos':'neg'}">${fmtRp(b.net)}</td>
    <td class="num">${b.net>0 ? (b.bAvg?idn(b.bAvg,0):'—') : (b.sAvg?idn(b.sAvg,0):'—')}</td></tr>`;
  $('#dTopBuy').innerHTML = r.netBuyers.slice(0,8).map(rowHTML).join('') || '<tr><td colspan="4" class="empty">—</td></tr>';
  $('#dTopSell').innerHTML = r.netSellers.slice(0,8).map(rowHTML).join('') || '<tr><td colspan="4" class="empty">—</td></tr>';

  // broker summary lengkap
  const all = [...r.brokers].sort((a,b)=>b.net-a.net);
  $('#dFullSum').innerHTML = all.map(b=>`<tr>
    <td><b>${b.code}</b> <span class="hint">${nameOf(b.code)}</span></td>
    <td><span class="chip"><span class="dot" style="background:${CATCOLOR[b.cat]}"></span>${CATS[b.cat]}</span></td>
    <td class="num">${b.buy?fmtRp(b.buy).replace('Rp ',''):'—'}</td>
    <td class="num">${b.bAvg?idn(b.bAvg,0):'—'}</td>
    <td class="num">${b.sell?fmtRp(b.sell).replace('Rp ',''):'—'}</td>
    <td class="num">${b.sAvg?idn(b.sAvg,0):'—'}</td>
    <td class="num ${b.net>0?'pos':b.net<0?'neg':''}">${fmtRp(b.net)}</td></tr>`).join('');
  const tBuy = all.reduce((s,b)=>s+b.buy,0), tSell = all.reduce((s,b)=>s+b.sell,0);
  $('#dFullTot').innerHTML = `<tr><td colspan="2">Total (${all.length} broker)</td>
    <td class="num">${fmtRp(tBuy).replace('Rp ','')}</td><td></td>
    <td class="num">${fmtRp(tSell).replace('Rp ','')}</td><td></td>
    <td class="num ${tBuy-tSell>0?'pos':'neg'}">${fmtRp(tBuy-tSell)}</td></tr>`;
  $('#saveMsg').textContent='';
}

/* ---------- Riwayat ---------- */
function loadHist(){ try{ return JSON.parse(localStorage.getItem('bdm_hist'))||{}; }catch(e){ return {}; } }
let history = loadHist();
const saveHist = ()=> localStorage.setItem('bdm_hist', JSON.stringify(history));

$('#btnSaveHist').onclick = ()=>{
  if(!lastResult) return;
  const r = lastResult;
  const arr = history[r.ticker] ??= [];
  const entry = {date:r.date, close:r.close, prev:r.prev, vol:r.vol, score:r.score, phase:r.phase,
    netF:r.catNet.ASING, netI:r.catNet.INSTITUSI, netR:r.catNet.RITEL, totalVal:r.totalVal};
  const i = arr.findIndex(x=>x.date===r.date);
  if(i>=0) arr[i]=entry; else arr.push(entry);
  arr.sort((a,b)=>a.date.localeCompare(b.date));
  saveHist();
  $('#saveMsg').textContent = `✓ Tersimpan ke riwayat ${r.ticker} (${arr.length} hari).`;
};

function renderHistTickers(){
  const sel = $('#histTicker');
  const cur = sel.value;
  const ticks = Object.keys(history).sort();
  sel.innerHTML = ticks.length ? ticks.map(t=>`<option>${t}</option>`).join('') : '<option value="">(kosong)</option>';
  if(ticks.includes(cur)) sel.value = cur;
}
$('#histTicker').onchange = renderHistory;
$('#histCum').onchange = renderHistory;

function renderHistory(){
  renderHistTickers();
  const t = $('#histTicker').value;
  const rows = (history[t]||[]);
  const tb = $('#histRows'); tb.innerHTML='';
  $('#histEmpty').style.display = rows.length?'none':'block';
  $('#histChartsWrap').style.display = rows.length?'block':'none';
  if(!rows.length){ return; }
  for(const r of rows){
    const chg = r.prev? (r.close-r.prev)/r.prev*100 : 0;
    tb.insertAdjacentHTML('beforeend', `<tr>
      <td>${r.date}</td><td class="num">${idn(r.close,0)}</td>
      <td class="num ${chg>=0?'pos':'neg'}">${fmtPct(chg)}</td>
      <td class="num">${r.vol?idn(r.vol/1e6,1)+' jt':'—'}</td>
      <td class="num ${r.netF>=0?'pos':'neg'}">${fmtRp(r.netF)}</td>
      <td class="num ${r.netI>=0?'pos':'neg'}">${fmtRp(r.netI)}</td>
      <td class="num ${r.netR>=0?'pos':'neg'}">${fmtRp(r.netR)}</td>
      <td class="num"><b>${r.score}</b></td><td>${r.phase}</td>
      <td><button class="btn small danger" data-hdel="${r.date}">✕</button></td></tr>`);
  }
  drawLineChart($('#chPrice'), $('#ttPrice'), rows, 'close');
  drawFlowChart($('#chFlow'), $('#ttFlow'), rows, $('#histCum').checked);
  // volume clustering
  const last = rows.slice(-7);
  let msg='';
  if(last.length>=4){
    const vols = last.map(r=>r.vol).filter(v=>v>0);
    const closes = last.map(r=>r.close);
    if(vols.length>=4){
      const mean = vols.reduce((a,b)=>a+b,0)/vols.length;
      const sd = Math.sqrt(vols.reduce((a,b)=>a+(b-mean)**2,0)/vols.length);
      const cv = sd/mean;
      const range = (Math.max(...closes)-Math.min(...closes))/Math.min(...closes);
      if(cv<0.25 && range<0.05)
        msg = `🔍 Volume clustering terdeteksi: ${last.length} hari terakhir volume stabil (variasi ${idn(cv*100,0)}%) pada rentang harga sempit (${idn(range*100,1)}%) — ciri perpindahan kepemilikan masif di zona konsolidasi.`;
    }
  }
  $('#histCluster').textContent = msg;
}
$('#histRows').addEventListener('click', e=>{
  const b = e.target.closest('button[data-hdel]'); if(!b) return;
  const t = $('#histTicker').value;
  history[t] = history[t].filter(r=>r.date!==b.dataset.hdel);
  if(!history[t].length) delete history[t];
  saveHist(); renderHistory();
});

/* ---------- Chart SVG ---------- */
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function niceTicks(min,max,n=4){
  if(min===max){min-=1;max+=1;}
  const span=max-min, step0=span/n, mag=10**Math.floor(Math.log10(step0));
  const step=[1,2,2.5,5,10].map(m=>m*mag).find(s=>span/s<=n)||mag*10;
  const lo=Math.floor(min/step)*step, hi=Math.ceil(max/step)*step;
  const t=[]; for(let v=lo;v<=hi+1e-9;v+=step) t.push(v); return t;
}
function chartFrame(W,H,padL,padR,padT,padB){
  return {W,H,padL,padR,padT,padB, iw:W-padL-padR, ih:H-padT-padB};
}
function svgOpen(f){ return `<svg viewBox="0 0 ${f.W} ${f.H}" xmlns="http://www.w3.org/2000/svg" role="img">`; }

function drawLineChart(box, tt, rows, key){
  const f = chartFrame(880,230,64,14,12,26);
  const vals = rows.map(r=>r[key]);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
  const y0=ticks[0], y1=ticks[ticks.length-1];
  const X = i => f.padL + (rows.length===1? f.iw/2 : i/(rows.length-1)*f.iw);
  const Y = v => f.padT + (1-(v-y0)/(y1-y0))*f.ih;
  let s = svgOpen(f);
  for(const tv of ticks){
    s+=`<line x1="${f.padL}" x2="${f.W-f.padR}" y1="${Y(tv)}" y2="${Y(tv)}" stroke="${cssVar('--grid')}" stroke-width="1"/>`;
    s+=`<text x="${f.padL-8}" y="${Y(tv)+4}" text-anchor="end" font-size="10.5" fill="${cssVar('--muted')}">${tv.toLocaleString('id-ID')}</text>`;
  }
  const step = Math.ceil(rows.length/8);
  rows.forEach((r,i)=>{ if(i%step===0 || i===rows.length-1)
    s+=`<text x="${X(i)}" y="${f.H-8}" text-anchor="middle" font-size="10.5" fill="${cssVar('--muted')}">${r.date.slice(5)}</text>`; });
  const pts = rows.map((r,i)=>`${X(i)},${Y(r[key])}`).join(' ');
  s+=`<polyline points="${pts}" fill="none" stroke="${cssVar('--blue')}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  rows.forEach((r,i)=>{ s+=`<circle cx="${X(i)}" cy="${Y(r[key])}" r="3" fill="${cssVar('--blue')}" stroke="${cssVar('--surface')}" stroke-width="2"/>`; });
  s+=`<line id="guide" x1="0" x2="0" y1="${f.padT}" y2="${f.H-f.padB}" stroke="${cssVar('--baseline')}" stroke-width="1" opacity="0"/>`;
  s+='</svg>';
  box.querySelector('svg')?.remove();
  box.insertAdjacentHTML('beforeend', s);
  hookTooltip(box, tt, rows, f, i=>{
    const r=rows[i], chg=r.prev?(r.close-r.prev)/r.prev*100:0;
    return `<b>${r.date}</b><br>Close: Rp ${idn(r.close,0)} (${fmtPct(chg)})<br>Score: ${r.score} · ${r.phase}`;
  });
}
function drawFlowChart(box, tt, rows, cumulative){
  const f = chartFrame(880,230,64,14,12,26);
  let vals = rows.map(r=>r.netF+r.netI);
  if(cumulative){ let c=0; vals = vals.map(v=>c+=v); }
  const ticks = niceTicks(Math.min(0,...vals), Math.max(0,...vals));
  const y0=ticks[0], y1=ticks[ticks.length-1];
  const X = i => f.padL + (rows.length===1? f.iw/2 : i/(rows.length-1)*f.iw);
  const Y = v => f.padT + (1-(v-y0)/(y1-y0))*f.ih;
  let s = svgOpen(f);
  for(const tv of ticks){
    s+=`<line x1="${f.padL}" x2="${f.W-f.padR}" y1="${Y(tv)}" y2="${Y(tv)}" stroke="${tv===0?cssVar('--baseline'):cssVar('--grid')}" stroke-width="${tv===0?1.5:1}"/>`;
    s+=`<text x="${f.padL-8}" y="${Y(tv)+4}" text-anchor="end" font-size="10.5" fill="${cssVar('--muted')}">${fmtRp(tv).replace('Rp ','')}</text>`;
  }
  const step = Math.ceil(rows.length/8);
  rows.forEach((r,i)=>{ if(i%step===0 || i===rows.length-1)
    s+=`<text x="${X(i)}" y="${f.H-8}" text-anchor="middle" font-size="10.5" fill="${cssVar('--muted')}">${r.date.slice(5)}</text>`; });
  if(cumulative){
    const pts = vals.map((v,i)=>`${X(i)},${Y(v)}`).join(' ');
    s+=`<polyline points="${pts}" fill="none" stroke="${cssVar('--aqua')}" stroke-width="2" stroke-linejoin="round"/>`;
    vals.forEach((v,i)=>{ s+=`<circle cx="${X(i)}" cy="${Y(v)}" r="3" fill="${cssVar('--aqua')}" stroke="${cssVar('--surface')}" stroke-width="2"/>`; });
  } else {
    const bw = Math.min(26, f.iw/rows.length - 2);
    vals.forEach((v,i)=>{
      const y=Y(Math.max(0,v)), h=Math.abs(Y(v)-Y(0));
      s+=`<rect x="${X(i)-bw/2}" y="${y}" width="${bw}" height="${Math.max(h,1)}" rx="3"
        fill="${v>=0?cssVar('--pos'):cssVar('--neg')}"/>`;
    });
  }
  s+='</svg>';
  box.querySelector('svg')?.remove();
  box.insertAdjacentHTML('beforeend', s);
  hookTooltip(box, tt, rows, f, i=>{
    const r=rows[i];
    return `<b>${r.date}</b><br>Asing: ${fmtRp(r.netF)}<br>Institusi: ${fmtRp(r.netI)}<br>Ritel: ${fmtRp(r.netR)}${cumulative?`<br>Kumulatif SM: ${fmtRp(vals[i])}`:''}`;
  });
}
function hookTooltip(box, tt, rows, f, htmlFor){
  const svg = box.querySelector('svg');
  svg.onmousemove = e=>{
    const rect = svg.getBoundingClientRect();
    const px = (e.clientX-rect.left)/rect.width*f.W;
    const frac = Math.min(1, Math.max(0, (px-f.padL)/f.iw));
    const i = Math.round(frac*(rows.length-1));
    tt.innerHTML = htmlFor(i);
    tt.style.display='block';
    const x = e.clientX-rect.left, y = e.clientY-rect.top;
    tt.style.left = Math.min(x+14, rect.width-170)+'px';
    tt.style.top = Math.max(y-10, 0)+'px';
  };
  svg.onmouseleave = ()=> tt.style.display='none';
}

/* ---------- Ekspor / Impor ---------- */
$('#btnExport').onclick = ()=>{
  const blob = new Blob([JSON.stringify({brokerMap, history}, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bandarmologi-data.json';
  a.click(); URL.revokeObjectURL(a.href);
};
$('#btnImport').onclick = ()=> $('#fileImport').click();
$('#fileImport').onchange = e=>{
  const file = e.target.files[0]; if(!file) return;
  const fr = new FileReader();
  fr.onload = ()=>{
    try{
      const d = JSON.parse(fr.result);
      if(d.brokerMap){ brokerMap=d.brokerMap; saveMap(); renderMap(); }
      if(d.history){ history=d.history; saveHist(); }
      renderHistory(); alert('Data berhasil diimpor.');
    }catch(err){ alert('File tidak valid: '+err.message); }
  };
  fr.readAsText(file); e.target.value='';
};

/* ---------- Trading plan ---------- */
function planCalc(){
  const cap=+$('#pCap').value, riskPct=+$('#pRisk').value,
    entry=+$('#pEntry').value, sl=+$('#pSL').value, tp1=+$('#pTP1').value, tp2=+$('#pTP2').value;
  const out=$('#planOut');
  if(!(cap>0&&entry>0&&sl>0)) { out.innerHTML='<div class="empty">Lengkapi modal, entry, dan stop loss.</div>'; return; }
  if(sl>=entry){ out.innerHTML='<div class="empty">Stop loss harus di bawah harga entry (posisi beli).</div>'; return; }
  const riskShare = entry-sl;
  const maxRisk = cap*riskPct/100;
  let shares = Math.floor(maxRisk/riskShare/100)*100;
  let note='';
  if(shares*entry > cap){ shares = Math.floor(cap/entry/100)*100; note=' (dibatasi modal)'; }
  const lots = shares/100, posVal = shares*entry;
  const rr1 = tp1>entry? (tp1-entry)/riskShare : null;
  const rr2 = tp2>entry? (tp2-entry)/riskShare : null;
  const line=(l,v)=>`<div class="line"><span>${l}</span><b>${v}</b></div>`;
  let h = line('Ukuran posisi', `${idn(lots,0)} lot (${idn(shares,0)} lembar)${note}`)
    + line('Nilai posisi', fmtRp(posVal))
    + line('Risiko maksimal (di SL)', `${fmtRp(shares*riskShare)} · ${fmtPct(-riskShare/entry*100)}`)
    + (rr1? line('Profit di TP1 '+idn(tp1,0), `${fmtRp(shares*(tp1-entry))} · ${fmtPct((tp1-entry)/entry*100)} · RR 1 : ${idn(rr1,1)}`):'')
    + (rr2? line('Profit di TP2 '+idn(tp2,0), `${fmtRp(shares*(tp2-entry))} · ${fmtPct((tp2-entry)/entry*100)} · RR 1 : ${idn(rr2,1)}`):'');
  const bestRR = rr2||rr1;
  if(bestRR!==null){
    const ok = bestRR>=2, mid = bestRR>=1.5;
    h += `<div class="verdict" style="color:${ok?'var(--goodtext)':mid?'var(--serious)':'var(--critical)'};border-color:${ok?'var(--good)':mid?'var(--serious)':'var(--critical)'}">
      ${ok?'✅ Layak: rasio risk-reward memenuhi standar institusional (≥ 1:2).'
        : mid?'⚠️ Marginal: RR di bawah 1:2 — pertimbangkan entry lebih rendah atau target lebih tinggi.'
        : '⛔ Tidak layak: potensi imbal hasil tidak sepadan dengan risiko.'}</div>`;
  }
  out.innerHTML=h;
}
$('#btnPlan').onclick = planCalc;

function fibCalc(){
  const hi=+$('#fHigh').value, lo=+$('#fLow').value;
  if(!(hi>lo&&lo>0)) { $('#fibRows').innerHTML='<tr><td colspan="3" class="empty">Swing high harus di atas swing low.</td></tr>'; return; }
  const levels=[[0,'Titik terendah (0%)'],[23.6,'Pemulihan minimum — target rebound pertama'],[38.2,'Retracement moderat'],[50,'Titik tengah psikologis'],[61.8,'Golden ratio — retracement dalam'],[78.6,'Retracement ekstrem'],[100,'Titik tertinggi (100%)']];
  $('#fibRows').innerHTML = levels.map(([p,d])=>{
    const price = lo + (hi-lo)*p/100;
    return `<tr><td>${p}%</td><td class="num"><b>${idn(price,0)}</b></td><td class="hint">${d}</td></tr>`;
  }).join('');
}
$('#btnFib').onclick = fibCalc;
fibCalc(); planCalc();

/* ---------- Backtest ---------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function gaussOf(rng){let u=0,v=0;while(u===0)u=rng();while(v===0)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}

function genSynthetic(){
  // Menanam siklus 4 fase (teori Wyckoff/bandarmologi) + noise, seed tetap agar hasil reprodusibel
  const rng = mulberry32(20260710);
  const cfg = {
    ACC:      {len:[22,38], drift: 0.0002, vol:0.007, sm: 0.0035, smv:0.0020},
    MARKUP:   {len:[14,26], drift: 0.0070, vol:0.012, sm: 0.0012, smv:0.0025},
    DIST:     {len:[14,24], drift: 0.0005, vol:0.008, sm:-0.0035, smv:0.0020},
    MARKDOWN: {len:[14,26], drift:-0.0060, vol:0.013, sm:-0.0015, smv:0.0025}
  };
  const order = ['ACC','MARKUP','DIST','MARKDOWN'];
  const rows = []; let price = 2500; const notional = 600e9;
  let d = new Date('2025-06-02T12:00:00Z'); let pi = 0;
  while(rows.length < 280){
    const c = cfg[order[pi++ % 4]];
    const len = Math.round(c.len[0] + rng()*(c.len[1]-c.len[0]));
    for(let j=0; j<len && rows.length<280; j++){
      price = Math.max(50, price*(1 + c.drift + gaussOf(rng)*c.vol));
      const smFrac = c.sm + gaussOf(rng)*c.smv;
      const smart = smFrac*notional;
      const netF = smart*0.45 + gaussOf(rng)*0.001*notional;
      const netI = smart - netF;
      const netR = -smart*0.75 + gaussOf(rng)*0.001*notional;
      const score = Math.max(0, Math.min(100, Math.round(50 + smFrac*7000 + gaussOf(rng)*5)));
      d = new Date(d.getTime()+86400000);
      while(d.getUTCDay()===0 || d.getUTCDay()===6) d = new Date(d.getTime()+86400000);
      rows.push({date:d.toISOString().slice(0,10), close:Math.round(price), netF, netI, netR, score});
    }
  }
  return rows;
}

function normDate(s){
  s = s.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
  if(m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return null;
}

function btSeries(){
  const src = $('#btSource').value;
  if(src==='demo') return {rows: genSynthetic(), label:'SINTETIS'};
  if(src==='hist'){
    const t = $('#btTicker').value;
    const rows = (history[t]||[]).map(r=>({date:r.date, close:r.close, netF:r.netF||0, netI:r.netI||0, netR:r.netR||0, score:r.score}));
    return {rows, label:t||'-'};
  }
  const mMean = parseFloat($('#inMMean').value)||1e6;
  const rows = [];
  for(const raw of $('#btCSV').value.split(/\r?\n/)){
    const line = raw.trim(); if(!line) continue;
    let toks;
    if(line.includes('\t')) toks = line.split(/\t+/);
    else if(line.includes(';')) toks = line.split(/;+/);
    else toks = line.split(/,/);
    toks = toks.map(t=>t.trim()).filter(Boolean);
    if(toks.length<2) continue;
    const date = normDate(toks[0]); if(!date) continue;
    const nums = toks.slice(1).map(t=>{const p=parseNumToken(t,mMean); return p?p.val:null;});
    if(nums[0]==null || !(nums[0]>0)) continue;
    rows.push({date, close:nums[0], netF:nums[1]||0, netI:nums[2]||0, netR:nums[3]||0, vol:nums[4]||0,
      score:(nums[5]!=null && isFinite(nums[5]))?nums[5]:null});
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  return {rows, label:'CSV'};
}

function btSignals(rows){
  const type = $('#btSignal').value;
  const K = Math.max(1, Math.floor(+$('#btK').value)||1);
  const flat = (+$('#btFlat').value||4)/100;
  const thr = +$('#btThr').value||62;
  const n = rows.length, sig = new Array(n).fill(false);
  const smart = rows.map(r=>(r.netF||0)+(r.netI||0));
  if(type==='score'){
    if(rows.some(r=>r.score==null)){ alert('Data ini tidak memiliki kolom score — pilih definisi sinyal lain.'); return null; }
    for(let i=0;i<n;i++) sig[i] = rows[i].score>=thr;
  } else if(type==='streak'){
    for(let i=K-1;i<n;i++){
      let ok = true;
      for(let j=i-K+1;j<=i;j++) if(!(smart[j]>0)){ ok=false; break; }
      if(ok) sig[i] = Math.abs(rows[i].close/rows[i-K+1].close - 1) <= flat;
    }
  } else { // divergensi cum-flow (jendela trailing 10 hari)
    const W = 10; let c = 0; const cums = smart.map(v=>c+=v);
    for(let i=W;i<n;i++){
      const cw = cums.slice(i-W+1,i+1);
      const pw = rows.slice(i-W+1,i+1).map(r=>r.close);
      sig[i] = cums[i] >= Math.max(...cw) && rows[i].close < Math.max(...pw)*0.998 && smart[i]>0;
    }
  }
  return sig;
}

const BT_HORIZONS = [1,3,5,20];
const BT_HLABEL = {1:'1 hari', 3:'3 hari', 5:'1 minggu', 20:'1 bulan'};
function btEventStudy(rows, sig){
  return BT_HORIZONS.map(h=>{
    let sSum=0,sN=0,sW=0,bSum=0,bN=0,bW=0;
    for(let i=0;i<rows.length-h;i++){
      const fwd = rows[i+h].close/rows[i].close - 1;
      if(sig[i]){ sSum+=fwd; sN++; if(fwd>0)sW++; }
      else{ bSum+=fwd; bN++; if(fwd>0)bW++; }
    }
    return {h, sAvg:sN?sSum/sN:null, sN, sWin:sN?sW/sN:null, bAvg:bN?bSum/bN:null, bN, bWin:bN?bW/bN:null};
  });
}

function btTradesSim(rows, sig){
  const hold = Math.max(1, Math.floor(+$('#btHold').value)||10);
  const sl = (+$('#btSL').value||0)/100, tp = (+$('#btTP').value||0)/100;
  const feeB = (+$('#btFeeB').value||0)/100, feeS = (+$('#btFeeS').value||0)/100;
  const trades = []; const n = rows.length; let i = 0;
  while(i < n-1){
    if(sig[i]){
      const eIdx = i+1, entry = rows[eIdx].close;
      let xIdx = Math.min(eIdx+hold, n-1), reason = 'Waktu';
      for(let j=eIdx+1; j<=Math.min(eIdx+hold, n-1); j++){
        const c = rows[j].close;
        if(sl>0 && c<=entry*(1-sl)){ xIdx=j; reason='Stop'; break; }
        if(tp>0 && c>=entry*(1+tp)){ xIdx=j; reason='Target'; break; }
      }
      const exit = rows[xIdx].close;
      const ret = (exit*(1-feeS))/(entry*(1+feeB)) - 1;
      trades.push({inDate:rows[eIdx].date, entry, outDate:rows[xIdx].date, exit, days:xIdx-eIdx, reason, ret});
      i = xIdx+1;
    } else i++;
  }
  return trades;
}

function btEquity(rows, trades){
  const feeB=(+$('#btFeeB').value||0)/100, feeS=(+$('#btFeeS').value||0)/100;
  const eq = new Array(rows.length); let e = 100; let t = 0;
  for(let i=0;i<rows.length;i++){
    const tr = trades[t];
    if(tr && rows[i].date===tr.inDate){
      e = e/(1+feeB);
      const entry = rows[i].close;
      eq[i] = e;
      let j;
      for(j=i+1; j<rows.length; j++){
        eq[j] = e*rows[j].close/entry;
        if(rows[j].date===tr.outDate){ e = eq[j]*(1-feeS); eq[j]=e; break; }
      }
      i = Math.min(j, rows.length-1); t++;
    } else eq[i] = e;
  }
  return eq;
}

function drawEquity(box, tt, rows, eq, bh){
  const f = chartFrame(880,260,64,14,12,26);
  const all = [...eq, ...bh];
  const ticks = niceTicks(Math.min(...all), Math.max(...all));
  const y0 = ticks[0], y1 = ticks[ticks.length-1];
  const X = i => f.padL + (rows.length===1? f.iw/2 : i/(rows.length-1)*f.iw);
  const Y = v => f.padT + (1-(v-y0)/(y1-y0))*f.ih;
  let s = svgOpen(f);
  for(const tv of ticks){
    s += `<line x1="${f.padL}" x2="${f.W-f.padR}" y1="${Y(tv)}" y2="${Y(tv)}" stroke="${tv===100?cssVar('--baseline'):cssVar('--grid')}" stroke-width="${tv===100?1.5:1}"/>`;
    s += `<text x="${f.padL-8}" y="${Y(tv)+4}" text-anchor="end" font-size="10.5" fill="${cssVar('--muted')}">${idn(tv,0)}</text>`;
  }
  const step = Math.ceil(rows.length/8);
  rows.forEach((r,i)=>{ if(i%step===0 || i===rows.length-1)
    s += `<text x="${X(i)}" y="${f.H-8}" text-anchor="middle" font-size="10.5" fill="${cssVar('--muted')}">${r.date.slice(2,7)}</text>`; });
  const path = arr => arr.map((v,i)=>`${X(i)},${Y(v)}`).join(' ');
  s += `<polyline points="${path(bh)}" fill="none" stroke="${cssVar('--aqua')}" stroke-width="2" stroke-linejoin="round"/>`;
  s += `<polyline points="${path(eq)}" fill="none" stroke="${cssVar('--blue')}" stroke-width="2" stroke-linejoin="round"/>`;
  s += '</svg>';
  box.querySelector('svg')?.remove();
  box.insertAdjacentHTML('beforeend', s);
  hookTooltip(box, tt, rows, f, i=>`<b>${rows[i].date}</b><br>Strategi: ${idn(eq[i],1)}<br>Buy &amp; Hold: ${idn(bh[i],1)}<br>Close: Rp ${idn(rows[i].close,0)}`);
}

function runBacktest(){
  const {rows, label} = btSeries();
  if(rows.length < 15) return alert(`Data terlalu sedikit (${rows.length} hari). Minimal 15 hari — idealnya 30+ agar hasil bermakna.`);
  const sig = btSignals(rows); if(!sig) return;
  const nSig = sig.filter(Boolean).length;
  if(!nSig) { $('#btOut').style.display='none'; return alert('Tidak ada hari yang memenuhi sinyal — coba longgarkan parameter.'); }
  const ev = btEventStudy(rows, sig);
  const trades = btTradesSim(rows, sig);
  const eq = btEquity(rows, trades);
  const bh = rows.map(r=>100*r.close/rows[0].close);
  // metrik
  const wins = trades.filter(t=>t.ret>0);
  const grossW = wins.reduce((s,t)=>s+t.ret,0);
  const grossL = Math.abs(trades.filter(t=>t.ret<0).reduce((s,t)=>s+t.ret,0));
  const pf = grossL>0 ? grossW/grossL : (grossW>0? Infinity : 0);
  const avgRet = trades.length? trades.reduce((s,t)=>s+t.ret,0)/trades.length : 0;
  let peak=-1e9, maxDD=0;
  for(const v of eq){ peak=Math.max(peak,v); maxDD=Math.min(maxDD,(v-peak)/peak); }
  const totalRet = eq[eq.length-1]-100, bhRet = bh[bh.length-1]-100;
  const avgDays = trades.length? trades.reduce((s,t)=>s+t.days,0)/trades.length : 0;

  const card = (l,v,d='',cls='')=>`<div class="card statcard"><div class="lbl">${l}</div><div class="val ${cls}">${v}</div><div class="det">${d}</div></div>`;
  $('#btCards').innerHTML =
    card('Data', `${rows.length} hari`, `${label} · sinyal: ${nSig} hari`)
    + card('Transaksi', trades.length, `rata-rata ${idn(avgDays,1)} hari/posisi`)
    + card('Win rate', trades.length? idn(wins.length/trades.length*100,0)+'%':'—', `${wins.length} untung / ${trades.length-wins.length} rugi`)
    + card('Rata-rata / trade', fmtPct(avgRet*100), 'sudah termasuk fee', avgRet>0?'pos':'neg')
    + card('Profit factor', pf===Infinity?'∞':idn(pf,2), 'total untung ÷ total rugi', pf>=1.5?'pos':pf<1?'neg':'')
    + card('Return strategi', fmtPct(totalRet), 'akhir periode, basis 100', totalRet>0?'pos':'neg')
    + card('Buy & Hold', fmtPct(bhRet), 'pembanding pasif', bhRet>0?'pos':'neg')
    + card('Max drawdown', fmtPct(maxDD*100), 'penurunan ekuitas terdalam', 'neg');

  $('#btAccCards').innerHTML = ev.map(e=>{
    const acc = e.sWin!=null? e.sWin*100 : null;
    const cls = acc==null?'':(acc>=55?'pos':acc<=45?'neg':'');
    return `<div class="card statcard"><div class="lbl">Naik setelah ${BT_HLABEL[e.h]}</div>
      <div class="val ${cls}">${acc!=null? idn(acc,0)+'%':'—'}</div>
      <div class="det">baseline ${e.bWin!=null?idn(e.bWin*100,0)+'%':'—'} · rata-rata ${e.sAvg!=null?fmtPct(e.sAvg*100):'—'}</div></div>`;
  }).join('');

  $('#btEventRows').innerHTML = ev.map(e=>{
    const delta = (e.sAvg!=null && e.bAvg!=null)? e.sAvg-e.bAvg : null;
    return `<tr><td>${BT_HLABEL[e.h]} (H+${e.h})</td>
      <td class="num"><b>${e.sWin!=null?idn(e.sWin*100,0)+'%':'—'}</b></td>
      <td class="num ${e.sAvg>0?'pos':'neg'}">${e.sAvg!=null?fmtPct(e.sAvg*100):'—'}</td>
      <td class="num">${e.sN}</td>
      <td class="num">${e.bWin!=null?idn(e.bWin*100,0)+'%':'—'}</td>
      <td class="num ${delta>0?'pos':'neg'}"><b>${delta!=null?fmtPct(delta*100):'—'} pp</b></td></tr>`;
  }).join('');

  const ew = ev[2]; // 1 minggu
  const v = $('#btVerdict');
  v.style.display='flex';
  if(ew.sN<5){
    v.style.color='var(--serious)'; v.style.borderColor='var(--serious)';
    v.innerHTML = `⚠️ Sampel sinyal terlalu kecil (${ew.sN} kejadian) — tambah data sebelum menarik kesimpulan.`;
  } else if(ew.sWin>ew.bWin && ew.sAvg>ew.bAvg){
    v.style.color='var(--goodtext)'; v.style.borderColor='var(--good)';
    v.innerHTML = `✅ Pada data ini sinyal H-1 <b>terbukti berguna</b>: 1 minggu setelah sinyal, harga naik pada <b>${idn(ew.sWin*100,0)}%</b> kejadian (baseline ${idn(ew.bWin*100,0)}%) dengan rata-rata ${fmtPct(ew.sAvg*100)} vs ${fmtPct(ew.bAvg*100)} (${ew.sN} kejadian). Ingat: hasil historis ≠ jaminan masa depan.`;
  } else {
    v.style.color='var(--critical)'; v.style.borderColor='var(--critical)';
    v.innerHTML = `⛔ Pada data ini sinyal H-1 <b>tidak lebih baik dari baseline</b> (naik ${idn((ew.sWin||0)*100,0)}% vs ${idn((ew.bWin||0)*100,0)}%). Periksa definisi sinyal atau kualitas data.`;
  }

  $('#btTradeRows').innerHTML = trades.map((t,i)=>`<tr>
    <td>${i+1}</td><td>${t.inDate}</td><td class="num">${idn(t.entry,0)}</td>
    <td>${t.outDate}</td><td class="num">${idn(t.exit,0)}</td><td class="num">${t.days}</td>
    <td>${t.reason==='Target'?'🎯 Target':t.reason==='Stop'?'🛑 Stop':'⏱ Waktu'}</td>
    <td class="num ${t.ret>0?'pos':'neg'}">${fmtPct(t.ret*100)}</td></tr>`).join('')
    || '<tr><td colspan="8" class="empty">Tidak ada transaksi.</td></tr>';

  $('#btOut').style.display='block';
  drawEquity($('#chEq'), $('#ttEq'), rows, eq, bh);
}
$('#btnRunBT').onclick = runBacktest;

function initBT(){
  const ticks = Object.keys(history).sort();
  for(const id of ['#btTicker','#wfTicker']){
    const sel = $(id); if(!sel) continue;
    const cur = sel.value;
    sel.innerHTML = ticks.length? ticks.map(t=>`<option>${t}</option>`).join('') : '<option value="">(kosong)</option>';
    if(ticks.includes(cur)) sel.value = cur;
  }
}
$('#btSource').onchange = ()=>{
  const src = $('#btSource').value;
  $('#btTickerWrap').style.display = src==='hist'?'block':'none';
  $('#btCSVWrap').style.display = src==='csv'?'block':'none';
  if(src==='hist') initBT();
};

/* ---------- Harga online (Yahoo Finance, dengan fallback proxy CORS) ---------- */
async function fetchYahoo(ticker, range='1y'){
  const target = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.JK?range=${range}&interval=1d`;
  const localProxy = location.protocol.startsWith('http')
    ? [location.origin+'/proxy?url='+encodeURIComponent(target)] : [];
  const urls = [
    ...localProxy, // server app.py — tercepat & tanpa pihak ketiga
    target,
    target.replace('query1','query2'),
    'https://corsproxy.io/?url='+encodeURIComponent(target),
    'https://api.allorigins.win/raw?url='+encodeURIComponent(target)
  ];
  let lastErr = '';
  for(const u of urls){
    try{
      const opt = {};
      if(typeof AbortSignal!=='undefined' && AbortSignal.timeout) opt.signal = AbortSignal.timeout(12000);
      const res = await fetch(u, opt);
      if(!res.ok){ lastErr = 'HTTP '+res.status; continue; }
      const j = await res.json();
      const r = j.chart && j.chart.result && j.chart.result[0];
      if(!r){ lastErr = (j.chart && j.chart.error && j.chart.error.description) || 'kode saham tidak ditemukan'; continue; }
      const q = r.indicators.quote[0], ts = r.timestamp || [];
      const rows = [];
      for(let i=0;i<ts.length;i++){
        const c = q.close[i]; if(c==null) continue;
        rows.push({date:new Date(ts[i]*1000).toISOString().slice(0,10), close:Math.round(c), vol:q.volume[i]||0,
          hi:(q.high&&q.high[i])||null, lo:(q.low&&q.low[i])||null});
      }
      if(!rows.length){ lastErr = 'tidak ada data harga'; continue; }
      return {rows, meta:r.meta};
    }catch(e){ lastErr = e.message; }
  }
  throw new Error(lastErr || 'semua jalur koneksi gagal');
}

$('#btnFetchPrice').onclick = async ()=>{
  const t = normTicker($('#inTicker').value);
  const msg = $('#fetchMsg'), btn = $('#btnFetchPrice');
  if(!/^[A-Z]{4}$/.test(t)) return alert('Isi kode saham 4 huruf dulu (mis. BBRI).');
  msg.textContent = `⏳ Mengambil harga ${t} dari Yahoo Finance…`;
  btn.disabled = true;
  try{
    const {rows, meta} = await fetchYahoo(t, '3mo');
    const last = rows[rows.length-1], prev = rows.length>1 ? rows[rows.length-2] : null;
    $('#inDate').value = last.date;
    $('#inClose').value = last.close;
    if(prev) $('#inPrev').value = prev.close;
    if(last.vol) $('#inVol').value = last.vol;
    const v20 = rows.slice(-21,-1).map(r=>r.vol).filter(v=>v>0);
    if(v20.length) $('#inAvgVol').value = Math.round(v20.reduce((a,b)=>a+b,0)/v20.length);
    const live = meta.regularMarketPrice;
    msg.innerHTML = `✅ <b>${t}</b>: close ${last.date} = <b>Rp ${idn(last.close,0)}</b>`
      + (live && Math.round(live)!==last.close ? ` · harga pasar terkini Rp ${idn(live,0)}` : '')
      + ` <span style="color:var(--muted)">(Yahoo Finance, bisa tertunda ±15 mnt · broker summary tetap diisi manual)</span>`;
  }catch(e){
    msg.innerHTML = `❌ <b>Gagal ambil harga:</b> ${e.message} — periksa internet lalu coba lagi, klik 🔌 Tes API Key untuk diagnosis, atau isi manual.`;
  }
  btn.disabled = false;
};

/* ---------- Broker summary online (GoAPI — perlu API key gratis) ---------- */
async function fetchJsonChainInfo(target){
  const routes = [
    ...(location.protocol.startsWith('http')
      ? [['proxy lokal', location.origin+'/proxy?url='+encodeURIComponent(target)]] : []),
    ['langsung', target],
    ['corsproxy', 'https://corsproxy.io/?url='+encodeURIComponent(target)],
    ['allorigins', 'https://api.allorigins.win/raw?url='+encodeURIComponent(target)]
  ];
  let lastErr = '';
  for(const [via, u] of routes){
    try{
      const opt = {};
      if(typeof AbortSignal!=='undefined' && AbortSignal.timeout) opt.signal = AbortSignal.timeout(15000);
      const res = await fetch(u, opt);
      const j = await res.json().catch(()=>null);
      if(j) return {json:j, via, http:res.status}; // GoAPI mengirim JSON juga saat error (401/404)
      lastErr = via+': HTTP '+res.status;
    }catch(e){ lastErr = via+': '+e.message; }
  }
  throw new Error(lastErr || 'semua jalur koneksi gagal');
}
async function fetchJsonChain(target){ return (await fetchJsonChainInfo(target)).json; }

$('#btnTestKey').onclick = async ()=>{
  const key = $('#goapiKey').value.trim();
  const out = $('#keyTestOut');
  if(!key){ out.style.display='block'; out.textContent='Tempel API key dulu di kolom di samping tombol.'; return; }
  out.style.display='block'; out.textContent='⏳ Menguji API key…';
  let d = new Date(Date.now()-86400000);
  while(d.getDay()===0 || d.getDay()===6) d = new Date(d.getTime()-86400000);
  const date = d.toISOString().slice(0,10);
  const lines = [];
  // tes 0: jalur Yahoo (untuk tombol Ambil Harga Online — tanpa key)
  try{
    const y = await fetchYahoo('BBRI','5d');
    lines.push(`✅ 0. Yahoo harga: OK (BBRI close ${idn(y.rows[y.rows.length-1].close,0)})`);
  }catch(e){ lines.push(`❌ 0. Yahoo harga: ${e.message}`); }
  out.textContent = lines.join('\n');
  const tests = [
    ['1. GoAPI harga (prices)', `https://api.goapi.io/stock/idx/prices?symbols=BBRI&api_key=${encodeURIComponent(key)}`],
    [`2. GoAPI broker summary BBRI (${date})`, `https://api.goapi.io/stock/idx/BBRI/broker_summary?date=${date}&api_key=${encodeURIComponent(key)}`]
  ];
  for(const [name, url] of tests){
    try{
      const {json, via, http} = await fetchJsonChainInfo(url);
      if(json.status==='success'){
        let extra = '';
        const dd = json.data;
        const res = dd && (dd.results ?? dd.data ?? null);
        if(Array.isArray(res)) extra = ` · results: array[${res.length}]${res[0]?` · kolom: ${Object.keys(res[0]).slice(0,12).join(', ')}`:''}`;
        else if(res && typeof res==='object') extra = ` · results berisi: ${Object.keys(res).slice(0,10).join(', ')}`;
        else if(dd) extra = ` · field data: ${Object.keys(dd).slice(0,8).join(', ')}`;
        lines.push(`✅ ${name}: BERHASIL via ${via}${extra}`);
      } else
        lines.push(`❌ ${name}: ${json.message || JSON.stringify(json).slice(0,140)} (via ${via}, HTTP ${http})`);
    }catch(e){ lines.push(`❌ ${name}: jaringan gagal — ${e.message}`); }
    out.textContent = lines.join('\n');
  }
  lines.push('— Salin hasil di atas jika butuh bantuan diagnosis.');
  out.textContent = lines.join('\n');
};

async function fetchBroksum(ticker, date, key){
  const j = await fetchJsonChain(`https://api.goapi.io/stock/idx/${ticker}/broker_summary?date=${date}&api_key=${encodeURIComponent(key)}`);
  if(j.status!=='success' || !j.data) throw new Error(j.message || 'respons GoAPI tidak dikenal');
  const toNum = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const okCode = c => /^[A-Z]{2}[A-Z0-9]?$/.test(c);
  const codeOf = x => String(x.broker_code ?? x.code ?? x.broker ?? x.brokerCode ?? '').toUpperCase().trim();
  const convOne = x => ({ code: codeOf(x),
    lot: toNum(x.lot ?? x.volume ?? 0),
    val: toNum(x.value ?? x.val ?? x.amount ?? 0),
    avg: toNum(x.average ?? x.avg ?? x.avg_price ?? x.price ?? 0) });
  const pickFrom = (o,...names)=>{ for(const n of names) if(o && Array.isArray(o[n])) return o[n]; return null; };

  let d = j.data;
  // turun ke dalam pembungkus (data.results / data.data / …) sampai ketemu daftar
  for(let depth=0; depth<4 && d && !Array.isArray(d); depth++){
    const bl = pickFrom(d,'buyers','brokers_buy','buy','top_buyers','buyer');
    const sl = pickFrom(d,'sellers','brokers_sell','sell','top_sellers','seller');
    if(bl || sl){
      const conv = list => (list||[]).map(convOne).filter(r=>okCode(r.code));
      return {buy:conv(bl), sell:conv(sl)};
    }
    d = d.results ?? d.data ?? d.summary ?? d.broker_summary ?? null;
  }
  if(Array.isArray(d) && d.length){
    // bentuk gabungan: satu baris per broker berisi kolom beli & jual sekaligus
    const buy=[], sell=[];
    for(const x of d){
      const code = codeOf(x);
      if(!okCode(code)) continue;
      const bval = toNum(x.bval ?? x.buy_value ?? x.buyValue ?? x.buy_val ?? x.buy ?? 0);
      const sval = toNum(x.sval ?? x.sell_value ?? x.sellValue ?? x.sell_val ?? x.sell ?? 0);
      const blot = toNum(x.blot ?? x.buy_lot ?? x.buyLot ?? 0);
      const slot = toNum(x.slot ?? x.sell_lot ?? x.sellLot ?? 0);
      const bavg = toNum(x.bavg ?? x.buy_avg ?? x.buyAvg ?? x.buy_average ?? 0);
      const savg = toNum(x.savg ?? x.sell_avg ?? x.sellAvg ?? x.sell_average ?? 0);
      if(bval>0) buy.push({code, lot:blot, val:bval, avg:bavg});
      if(sval>0) sell.push({code, lot:slot, val:sval, avg:savg});
      if(!bval && !sval){
        const ty = String(x.type ?? x.side ?? '').toLowerCase();
        const r = convOne(x);
        if(r.val>0 && ty.startsWith('b')) buy.push(r);
        else if(r.val>0 && (ty.startsWith('s') || ty.startsWith('j'))) sell.push(r);
      }
    }
    if(buy.length || sell.length) return {buy, sell};
  }
  let sample=''; try{ sample = JSON.stringify(j.data).slice(0,320); }catch(e){}
  throw new Error('format data tidak dikenali — cuplikan respons: '+sample);
}

$('#goapiKey').value = localStorage.getItem('bdm_goapi_key') || '';
$('#goapiKey').addEventListener('change', ()=> localStorage.setItem('bdm_goapi_key', $('#goapiKey').value.trim()));

$('#btnFetchBroksum').onclick = async ()=>{
  const t = normTicker($('#inTicker').value);
  const date = $('#inDate').value;
  const key = $('#goapiKey').value.trim();
  const msg = $('#broksumMsg'), btn = $('#btnFetchBroksum');
  if(!/^[A-Z]{4}$/.test(t)) return alert('Isi kode saham dulu (mis. BBRI).');
  if(!date) return alert('Isi tanggal dulu — broker summary terbit setelah market tutup.');
  if(!key) return alert('Masukkan API key GoAPI dulu.\nDaftar gratis di goapi.io → dashboard → salin API key ke kolom di samping tombol.');
  msg.textContent = `⏳ Mengambil broker summary ${t} (${date})…`;
  btn.disabled = true;
  try{
    const {buy, sell} = await fetchBroksum(t, date, key);
    if(!buy.length && !sell.length) throw new Error('data kosong — mungkin tanggal libur bursa atau broksum belum terbit');
    const fmt = r=>{
      const parts=[r.code];
      if(r.avg){ parts.push(r.lot||0, r.val||0, r.avg); }
      else if(r.lot){ parts.push(r.lot, r.val||0); }
      else parts.push(r.val||0);
      return parts.join('\t');
    };
    $('#inBuy').value = buy.map(fmt).join('\n');
    $('#inSell').value = sell.map(fmt).join('\n');
    $('#inUnit').value = '1';
    msg.innerHTML = `✅ Broker summary <b>${t}</b> ${date}: ${buy.length} buyer · ${sell.length} seller terisi — klik <b>🔎 Analisis Sekarang</b>.`;
  }catch(e){
    msg.innerHTML = `❌ <b>Gagal:</b> ${e.message} — klik <b>🔌 Tes API Key</b> untuk diagnosis rinci.`;
    const out = $('#keyTestOut'); out.style.display='block';
    out.textContent = `Error broksum ${t} ${date}: ${e.message}`;
  }
  btn.disabled = false;
};

/* ---------- Broksum Multi-Hari ---------- */
let mdResult = null;

function initMD(){
  if(!$('#mdTicker').value) $('#mdTicker').value = normTicker($('#inTicker').value);
  if(!$('#mdTo').value){
    const today = new Date().toISOString().slice(0,10);
    $('#mdTo').value = today;
    const d = new Date(Date.now() - 6*86400000);
    $('#mdFrom').value = d.toISOString().slice(0,10);
  }
}

// gabungkan rekaman harian → agregat per broker → render (dipakai mode GoAPI & tempel manual)
function finishMulti(t, daily, skipped){
  if(!daily.length) throw new Error('semua hari gagal: '+(skipped.join(' · ')||'tidak ada data'));
  daily.sort((a,b)=>a.date.localeCompare(b.date));
  const agg = {};
  for(const d of daily) for(const b of d.rec.brokers){
    const a = agg[b.code] ??= {code:b.code, cat:b.cat, buy:0, sell:0, blot:0, slot:0, days:0, daysPos:0, daysNeg:0, wb:0, wbv:0, ws:0, wsv:0};
    a.buy += b.buy; a.sell += b.sell; a.days++;
    a.blot += b.blot||0; a.slot += b.slot||0;
    if(b.net>0) a.daysPos++; else if(b.net<0) a.daysNeg++;
    if(b.bAvg && b.buy){ a.wb += b.bAvg*b.buy; a.wbv += b.buy; }
    if(b.sAvg && b.sell){ a.ws += b.sAvg*b.sell; a.wsv += b.sell; }
  }
  const aggBrokers = Object.values(agg).map(a=>({...a, net:a.buy-a.sell, netLot:a.blot-a.slot,
    bAvg: a.wbv? a.wb/a.wbv : null, sAvg: a.wsv? a.ws/a.wsv : null}));
  const aggRec = computeDay(aggBrokers.map(a=>({code:a.code, buy:a.buy, sell:a.sell, bAvg:a.bAvg, sAvg:a.sAvg})),
    daily[0].prev || daily[0].close, daily[daily.length-1].close);
  mdResult = {ticker:t, from:daily[0].date, to:daily[daily.length-1].date, daily, aggBrokers, aggRec, skipped};
  renderMD(mdResult);
  const saved = mdSaveToHistory(); // simpan otomatis — untuk Riwayat, Backtest & Uji Prediksi
  if(saved) $('#mdSaveMsg').innerHTML = `✅ ${saved} hari <b>${t}</b> otomatis tersimpan ke Riwayat.`;
}

function mdDayRec(buyRows, sellRows, prev, close){
  const m = {};
  const slot = code => m[code] ??= {buy:0,sell:0,bAvg:null,sAvg:null,blot:0,slot:0};
  buyRows.forEach(r=>{ const o=slot(r.code); o.buy += r.val; o.blot += r.lot||0; if(r.avg) o.bAvg = r.avg; });
  sellRows.forEach(r=>{ const o=slot(r.code); o.sell += r.val; o.slot += r.lot||0; if(r.avg) o.sAvg = r.avg; });
  return computeDay(Object.entries(m).map(([code,o])=>({code,...o})), prev, close);
}

/* blok tempel manual per hari */
function mdAddDay(){
  const wrap = document.createElement('div');
  wrap.className = 'mdday';
  wrap.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin:0 0 10px';
  wrap.innerHTML = `
    <div class="row" style="margin-bottom:6px">
      <b class="mdnum"></b>
      <input type="date" class="mddate" style="width:160px">
      <input type="number" class="mdclose" placeholder="Close (opsional — otomatis dari Yahoo)" style="width:250px">
      <div class="spacer" style="flex:1"></div>
      <button class="btn small danger mddel" type="button">✕ Hapus</button>
    </div>
    <div class="grid cols2">
      <label class="fld" style="margin:0"><span>🟦 Top Buyer</span><textarea class="mdbuy" style="min-height:100px" placeholder="CC  620000  172.4B  2781&#10;OD  540000  150.1B  2779"></textarea></label>
      <label class="fld" style="margin:0"><span>🟥 Top Seller</span><textarea class="mdsell" style="min-height:100px" placeholder="BK  520000  144.6B  2781&#10;ZP  410000  114.0B  2780"></textarea></label>
    </div>`;
  const dates = $$('#mdDays .mddate').map(i=>i.value).filter(Boolean);
  if(dates.length){
    let d = new Date(dates[dates.length-1]+'T12:00:00Z');
    do{ d = new Date(d.getTime()+86400000); } while(d.getUTCDay()===0 || d.getUTCDay()===6);
    wrap.querySelector('.mddate').value = d.toISOString().slice(0,10);
  }
  $('#mdDays').appendChild(wrap);
  $$('#mdDays .mdnum').forEach((el,i)=> el.textContent = 'Hari '+(i+1));
}
$('#btnMDAddDay').onclick = mdAddDay;
$('#mdDays').addEventListener('click', e=>{
  const b = e.target.closest('.mddel'); if(!b) return;
  b.closest('.mdday').remove();
  $$('#mdDays .mdnum').forEach((el,i)=> el.textContent = 'Hari '+(i+1));
});
$('#mdSource').onchange = ()=>{
  const manual = $('#mdSource').value==='manual';
  $$('.mdApiOnly').forEach(el=> el.style.display = manual? 'none':'block');
  $('#mdManualWrap').style.display = manual? 'block':'none';
  if(manual && !$('#mdDays').children.length){ mdAddDay(); mdAddDay(); mdAddDay(); }
};

async function runMultiApi(t, st){
  const from = $('#mdFrom').value, to = $('#mdTo').value;
  const key = $('#goapiKey').value.trim();
  if(!from || !to || from>to) throw new Error('rentang tanggal tidak valid.');
  if(!key) throw new Error('API key GoAPI belum diisi — tempel dulu di tab 📥 Input Data.');
  st.textContent = '⏳ Mengambil data harga…';
  const {rows:prows} = await fetchYahoo(t, '6mo');
  const pmap = {};
  prows.forEach((r,i)=> pmap[r.date] = {close:r.close, prev: i>0? prows[i-1].close : null, vol:r.vol, hi:r.hi, lo:r.lo});
  const days = prows.filter(r=>r.date>=from && r.date<=to).map(r=>r.date);
  if(!days.length) throw new Error('tidak ada hari bursa pada rentang itu (cek tanggal — akhir pekan/libur?)');
  if(days.length>15) throw new Error(`rentang berisi ${days.length} hari bursa — batasi maksimal 15 hari untuk menghemat kuota API`);
  const daily = [], skipped = [];
  let cacheHits = 0;
  for(let i=0;i<days.length;i++){
    const date = days[i];
    st.textContent = `⏳ Broker summary ${date} (${i+1}/${days.length})…`;
    let bs;
    try{ bs = await fetchBroksumCached(t, date, key); if(bs.fromCache) cacheHits++; }
    catch(e){ skipped.push(`${date}: ${e.message.slice(0,60)}`); continue; }
    if(!bs.buy.length && !bs.sell.length){ skipped.push(`${date}: kosong`); continue; }
    const p = pmap[date] || {};
    const prev = p.prev ?? p.close ?? 1, close = p.close ?? prev;
    daily.push({date, close, prev, vol:p.vol||0, hi:p.hi||0, lo:p.lo||0, rec: mdDayRec(bs.buy, bs.sell, prev, close)});
  }
  finishMulti(t, daily, skipped);
  const cnote = cacheHits? ` · ${cacheHits} dari cache (hemat kuota)` : '';
  return (skipped.length? `⚠ ${daily.length} hari dianalisis, ${skipped.length} dilewati (${skipped.join(' · ').slice(0,140)})` : `✅ ${daily.length} hari bursa dianalisis.`) + cnote;
}

async function runMultiManual(t, st){
  const unit = parseFloat($('#inUnit').value) || 1;
  const mMean = parseFloat($('#inMMean').value) || 1e6;
  const blocks = $$('#mdDays .mdday').map(b=>({
    date: b.querySelector('.mddate').value,
    closeManual: parseFloat(b.querySelector('.mdclose').value) || null,
    buy: parseSide(b.querySelector('.mdbuy').value, unit, mMean),
    sell: parseSide(b.querySelector('.mdsell').value, unit, mMean)
  })).filter(x=>x.date && (x.buy.length || x.sell.length));
  if(!blocks.length) throw new Error('belum ada blok hari yang terisi lengkap (tanggal + data buyer/seller).');
  const dup = blocks.map(b=>b.date).filter((d,i,a)=>a.indexOf(d)!==i);
  if(dup.length) throw new Error('tanggal ganda: '+[...new Set(dup)].join(', '));
  blocks.sort((a,b)=>a.date.localeCompare(b.date));
  st.textContent = '⏳ Mengambil harga penutupan dari Yahoo…';
  let pmap = {};
  try{
    const {rows:prows} = await fetchYahoo(t, '6mo');
    prows.forEach((r,i)=> pmap[r.date] = {close:r.close, prev: i>0? prows[i-1].close : null, vol:r.vol, hi:r.hi, lo:r.lo});
  }catch(e){ /* offline — pakai kolom Close manual */ }
  const daily = [], skipped = [];
  let lastClose = null;
  for(const blk of blocks){
    const p = pmap[blk.date] || {};
    const close = blk.closeManual ?? p.close ?? null;
    const prev = p.prev ?? lastClose ?? close;
    if(close==null){ skipped.push(`${blk.date}: harga tidak ditemukan — isi kolom Close`); continue; }
    daily.push({date:blk.date, close, prev: prev??close, vol:p.vol||0, hi:p.hi||0, lo:p.lo||0, rec: mdDayRec(blk.buy, blk.sell, prev||close, close)});
    lastClose = close;
  }
  finishMulti(t, daily, skipped);
  return skipped.length? `⚠ ${daily.length} hari dianalisis, ${skipped.length} dilewati (${skipped.join(' · ')})` : `✅ ${daily.length} hari (tempel manual) dianalisis.`;
}

$('#btnRunMD').onclick = async ()=>{
  const t = normTicker($('#mdTicker').value);
  const st = $('#mdStatus'), btn = $('#btnRunMD');
  if(!/^[A-Z]{4}$/.test(t)) return alert('Isi kode saham dulu (mis. RAJA).');
  btn.disabled = true;
  try{
    st.textContent = $('#mdSource').value==='manual'
      ? await runMultiManual(t, st)
      : await runMultiApi(t, st);
  }catch(e){
    st.textContent = '❌ '+e.message;
    $('#mdOut').style.display = 'none';
  }
  btn.disabled = false;
};

// Profil perilaku per broker: churn, beli-saat-lemah, posisi beli, pembalikan arah
function brokerProfiles(r){
  const {daily} = r;
  const n = daily.length, half = Math.floor(n/2);
  const byCode = {};
  daily.forEach((d,i)=>{
    const chg = d.prev? (d.close-d.prev)/d.prev : 0;
    for(const b of d.rec.brokers){
      const p = byCode[b.code] ??= {code:b.code, cat:b.cat, buy:0, sell:0, nets:[], buyRed:0, buyTot:0, posSum:0, posN:0};
      p.buy += b.buy; p.sell += b.sell;
      p.nets.push({i, net:b.net});
      if(b.net>0){ p.buyTot += b.net; if(chg<=0) p.buyRed += b.net; }
      if(b.bAvg && d.hi>d.lo && d.lo>0){
        p.posSum += Math.min(1, Math.max(0, (b.bAvg-d.lo)/(d.hi-d.lo))); p.posN++;
      }
    }
  });
  return Object.values(byCode).map(p=>{
    const net = p.buy - p.sell, gross = p.buy + p.sell;
    const churn = Math.max(p.buy,p.sell)>0? Math.min(p.buy,p.sell)/Math.max(p.buy,p.sell) : 0;
    const daysPos = p.nets.filter(x=>x.net>0).length;
    const daysNeg = p.nets.filter(x=>x.net<0).length;
    const net1 = p.nets.filter(x=>x.i<half).reduce((s,x)=>s+x.net,0);
    const net2 = p.nets.filter(x=>x.i>=half).reduce((s,x)=>s+x.net,0);
    const flip = (n>=4 && net1*net2<0 && Math.abs(net1)>0.02*gross && Math.abs(net2)>0.02*gross)
      ? (net1>0? 'DIST' : 'AKUM') : null;
    const buyRedPct = p.buyTot>0? p.buyRed/p.buyTot : null;
    const pricePos = p.posN? p.posSum/p.posN : null;
    let label, ic;
    const consistB = n>=2 && daysPos>=Math.ceil(n*0.75);
    const consistS = n>=2 && daysNeg>=Math.ceil(n*0.75);
    if(churn>=0.8){ label='Trader dua arah — bukan sinyal akumulasi'; ic='🌀'; }
    else if(net>0 && consistB && buyRedPct!=null && buyRedPct>=0.5){ label='Akumulator sabar — beli saat lemah'; ic='🐳'; }
    else if(net>0 && consistB){ label='Akumulator konsisten'; ic='📥'; }
    else if(net>0 && buyRedPct!=null && buyRedPct<0.3){ label='Agresor — beli saat harga naik'; ic='🚀'; }
    else if(net>0){ label='Akumulator'; ic='📥'; }
    else if(net<0 && consistS){ label='Distributor konsisten'; ic='📤'; }
    else if(net<0){ label='Distributor'; ic='📤'; }
    else { label='Netral'; ic='▫️'; }
    return {code:p.code, cat:p.cat, net, gross, churn, daysPos, daysNeg, flip, buyRedPct, pricePos, label, ic};
  }).sort((a,b)=>b.gross-a.gross);
}

// Checklist kualitas akumulasi — 13 faktor riset yang mendahului kenaikan harga
function bandarQuality(r, profs){
  const {daily, aggBrokers, aggRec} = r;
  const n = daily.length, last = daily[n-1];
  const totVal = daily.reduce((s,d)=>s+d.rec.totalVal,0) || 1;
  const accB = aggBrokers.filter(b=>b.net>0), disB = aggBrokers.filter(b=>b.net<0);
  const accTot = accB.reduce((s,b)=>s+b.net,0) || 1;
  const disTot = Math.abs(disB.reduce((s,b)=>s+b.net,0)) || 1;
  const topC = [...accB].sort((a,b)=>b.net-a.net).slice(0,3);
  const F = [];
  const add = (ok, w, name, desc, na=false)=> F.push({ok:!!ok && !na, w, name, desc, na});

  // F1 — konsentrasi asimetris (HHI): barang mengumpul di sedikit tangan
  const hhi = (arr,tot)=> arr.reduce((s,b)=>s+Math.pow(Math.abs(b.net)/tot,2),0);
  const hhiB = hhi(accB,accTot), hhiS = hhi(disB,disTot);
  add(hhiB > hhiS*1.25, 15, 'Konsentrasi asimetris (HHI)',
    `indeks pemusatan pembeli ${idn(hhiB,2)} vs penjual ${idn(hhiS,2)} — ${hhiB>hhiS*1.25?'pembeli jauh lebih terpusat: suplai berpindah ke sedikit tangan':'pembeli belum lebih terpusat dari penjual'}`);

  // F2 — konsistensi collector (order-splitting institusi)
  const consistN = topC.filter(b=>n>=2 && b.daysPos>=Math.ceil(n*0.75)).length;
  add(consistN>=1, 15, 'Collector konsisten',
    `${consistN} dari top-3 collector net buy pada ≥75% hari — jejak order besar yang dicicil`, n<2);

  // F3 — akumulasi senyap (stealth): menyerap tanpa menggerakkan harga
  const smartPct = aggRec.smart/totVal*100;
  add(smartPct>=2 && Math.abs(aggRec.priceChg)<=3, 20, 'Akumulasi senyap (stealth)',
    `smart money ${fmtPct(smartPct)} dari nilai transaksi sementara harga hanya ${fmtPct(aggRec.priceChg)} — ${smartPct>=2&&Math.abs(aggRec.priceChg)<=3?'menyerap diam-diam, sinyal terkuat sebelum mark-up':'tidak terpenuhi'}`);

  // F4 — absorpsi tekanan jual
  add(aggRec.bigForeignSell && aggRec.priceChg>-1 && aggRec.catNet.INSTITUSI>0, 12, 'Absorpsi tekanan jual',
    aggRec.bigForeignSell? `asing melepas ${fmtRp(aggRec.catNet.ASING)} tapi harga bertahan — ada penyerap kuat` : 'tidak ada tekanan jual besar yang perlu diserap');

  // F5 — ritel keluar (counterparty klasik akumulasi)
  add(aggRec.catNet.RITEL < -0.02*totVal, 8, 'Ritel keluar',
    `ritel net ${fmtRp(aggRec.catNet.RITEL)} — ${aggRec.catNet.RITEL<-0.02*totVal?'publik menyerahkan barang ke tangan besar':'ritel belum menyerahkan barang'}`);

  // F6 — momentum akumulasi menguat
  if(n>=4){
    const h1 = daily.slice(0,Math.floor(n/2)), h2 = daily.slice(Math.floor(n/2));
    const s1 = h1.reduce((s,d)=>s+d.rec.score,0)/h1.length, s2 = h2.reduce((s,d)=>s+d.rec.score,0)/h2.length;
    add(s2-s1>=4, 4, 'Momentum menguat', `skor paruh kedua ${Math.round(s2)} vs paruh pertama ${Math.round(s1)}`);
  } else add(false, 4, 'Momentum menguat', 'butuh ≥4 hari data', true);

  // F7 — harga dekat modal bandar (masih dijaga, belum di-mark-up)
  const cb = topC.filter(b=>b.bAvg && b.buy>0);
  if(cb.length){
    const cost = cb.reduce((s,b)=>s+b.bAvg*b.buy,0)/cb.reduce((s,b)=>s+b.buy,0);
    const dev = (last.close/cost-1)*100;
    add(dev>=-2 && dev<=5, 3, 'Dekat modal bandar', `harga ${fmtPct(dev)} dari rata-rata akumulasi collector (${idn(cost,0)})`);
  } else add(false, 3, 'Dekat modal bandar', 'data harga rata-rata beli tidak tersedia', true);

  // F8 — volume clustering (perpindahan masif di rentang sempit)
  const vols = daily.map(d=>d.vol).filter(v=>v>0);
  if(vols.length>=3){
    const mean = vols.reduce((a,b)=>a+b,0)/vols.length;
    const cv = Math.sqrt(vols.reduce((a,b)=>a+(b-mean)**2,0)/vols.length)/mean;
    const closes = daily.map(d=>d.close);
    const rng = (Math.max(...closes)-Math.min(...closes))/Math.min(...closes);
    add(cv<0.3 && rng<0.05, 6, 'Volume clustering', `variasi volume ${idn(cv*100,0)}%, rentang harga ${idn(rng*100,1)}% — ${cv<0.3&&rng<0.05?'volume stabil di rentang sempit: perpindahan kepemilikan':'belum membentuk klaster'}`);
  } else add(false, 6, 'Volume clustering', 'butuh ≥3 hari data volume', true);

  // F9 — kekuatan penutupan (VSA: demand mengontrol close)
  const ohlc = daily.filter(d=>d.hi>d.lo && d.lo>0);
  if(ohlc.length>=2){
    const cs = ohlc.reduce((s,d)=>s+(d.close-d.lo)/(d.hi-d.lo),0)/ohlc.length;
    add(cs>=0.6, 8, 'Kekuatan penutupan', `rata-rata close di ${idn(cs*100,0)}% rentang harian — ${cs>=0.6?'pembeli mengangkat harga jelang tutup':'penutupan masih lemah'}`);
  } else add(false, 8, 'Kekuatan penutupan', 'butuh data high-low (online)', true);

  // F10 — spring / shakeout Wyckoff (tusukan ke bawah lalu ditutup pulih + smart buy)
  if(ohlc.length>=3){
    let spring = null;
    for(let i=1;i<daily.length;i++){
      const d = daily[i];
      if(!(d.hi>d.lo && d.lo>0)) continue;
      const prior = daily.slice(0,i).map(x=>x.lo).filter(v=>v>0);
      if(prior.length && d.lo<Math.min(...prior) && d.close>d.lo+(d.hi-d.lo)*0.5
        && (d.rec.catNet.ASING+d.rec.catNet.INSTITUSI)>0) spring = d.date;
    }
    add(!!spring, 9, 'Spring / shakeout', spring? `${spring}: harga ditusuk ke bawah low sebelumnya lalu ditutup pulih dengan smart money net buy — jebakan bagi penjual panik` : 'tidak ada pola spring pada periode ini');
  } else add(false, 9, 'Spring / shakeout', 'butuh ≥3 hari data high-low', true);

  // F11–F13 — pemahaman perilaku broker (profil)
  const topCodes = topC.map(b=>b.code);
  const topProf = (profs||[]).filter(p=>topCodes.includes(p.code));
  if(topProf.length){
    const dirty = topProf.filter(p=>p.churn>=0.6);
    add(dirty.length===0, 8, 'Collector bersih dari churn',
      `perputaran dua arah top collector: ${topProf.map(p=>`${p.code} ${idn(p.churn*100,0)}%`).join(' · ')} — ${dirty.length===0?'net buy asli, bukan sekadar trading bolak-balik':dirty.map(p=>p.code).join(', ')+' lebih banyak memutar barang daripada menampung'}`);
  } else add(false, 8, 'Collector bersih dari churn', 'tidak ada collector dinilai', true);
  const bw = topProf.filter(p=>p.buyRedPct!=null);
  if(bw.length){
    const avgBR = bw.reduce((s,p)=>s+p.buyRedPct,0)/bw.length;
    add(avgBR>=0.5, 8, 'Beli saat lemah (buy on weakness)',
      `${idn(avgBR*100,0)}% pembelian collector terjadi di hari merah/datar — ${avgBR>=0.5?'sabar menampung barang murah, ciri akumulator sejati':'lebih banyak mengejar harga naik (momentum, bukan akumulasi)'}`);
  } else add(false, 8, 'Beli saat lemah (buy on weakness)', 'data harian tidak cukup', true);
  const flipped = topProf.filter(p=>p.flip==='DIST');
  add(topProf.length>0 && flipped.length===0, 6, 'Tidak ada collector berbalik arah',
    flipped.length? `${flipped.map(p=>p.code).join(', ')} berbalik menjadi penjual di paruh kedua — peringatan dini distribusi`
      : 'semua collector utama bertahan di sisi beli sampai akhir periode',
    topProf.length===0 || n<4);

  const avail = F.filter(f=>!f.na);
  const maxW = avail.reduce((s,f)=>s+f.w,0) || 1;
  const pts = avail.reduce((s,f)=>s+(f.ok?f.w:0),0);
  const pct = Math.round(pts/maxW*100);
  const grade = pct>=70?'A':pct>=50?'B':pct>=30?'C':'D';
  return {F, pts, maxW, pct, grade};
}

function renderMD(r){
  const {daily, aggBrokers, aggRec, ticker} = r;
  const n = daily.length, last = daily[n-1];
  const totVal = daily.reduce((s,d)=>s+d.rec.totalVal,0);
  const totVol = daily.reduce((s,d)=>s+(d.vol||0),0);
  const avgScore = Math.round(daily.reduce((s,d)=>s+d.rec.score,0)/n);
  const buyers = aggBrokers.filter(b=>b.net>0).sort((a,b)=>b.net-a.net).slice(0,10);
  const sellers = aggBrokers.filter(b=>b.net<0).sort((a,b)=>a.net-b.net).slice(0,10);

  // kuantifikasi akumulasi smart money (asing + institusi)
  const smartVal = aggRec.smart;
  const smartLot = aggBrokers.reduce((s,b)=> (b.cat==='ASING'||b.cat==='INSTITUSI')? s+(b.netLot||0) : s, 0);
  const intens = Math.abs(smartVal)/(totVal||1)*100;
  const intensLbl = intens<1.5?'tipis':intens<4?'sedang':intens<8?'besar':'sangat besar';
  const lotStr = lots => idn(Math.abs(lots)*100/1e6,1)+' jt lembar';

  const card = (l,v,d,cls='')=>`<div class="card statcard"><div class="lbl">${l}</div><div class="val ${cls}">${v}</div><div class="det">${d}</div></div>`;
  $('#mdCards').innerHTML =
    card(`${ticker} · ${r.from} → ${r.to}`, `Rp ${idn(last.close,0)}`,
      `${fmtPct(aggRec.priceChg)} selama ${n} hari bursa · total transaksi ${fmtRp(totVal)}`, aggRec.priceChg>=0?'pos':'neg')
    + card('Bandar Score Agregat', aggRec.score,
      `${aggRec.phaseIcon} ${aggRec.phase} · rata-rata skor harian ${avgScore}`, aggRec.score>=62?'pos':aggRec.score<=38?'neg':'')
    + card(`${smartVal>=0?'Akumulasi':'Distribusi'} Smart Money`, fmtRp(smartVal),
      `<b>${idn(intens,1)}%</b> dari nilai transaksi (${intensLbl})`
      + (smartLot? ` · ±${lotStr(smartLot)}` : '')
      + (totVol && smartLot? ` · ${idn(Math.abs(smartLot)*100/totVol*100,1)}% volume` : ''),
      smartVal>0?'pos':smartVal<0?'neg':'')
    + card('Aliran Kategori (total periode)',
      `<span style="font-size:15px">Asing ${fmtRp(aggRec.catNet.ASING)}</span>`,
      `Institusi ${fmtRp(aggRec.catNet.INSTITUSI)} · Ritel ${fmtRp(aggRec.catNet.RITEL)}`);

  // neraca: berapa akumulasi & distribusi terjadi
  const accB = aggBrokers.filter(b=>b.net>0), disB = aggBrokers.filter(b=>b.net<0);
  const accTot = accB.reduce((s,b)=>s+b.net,0);
  const accLotT = accB.reduce((s,b)=>s+Math.max(0,b.netLot||0),0);
  const catLine = arr => ['ASING','INSTITUSI','RITEL','LAINNYA'].map(k=>{
    const v = arr.filter(b=>b.cat===k).reduce((s,b)=>s+b.net,0);
    return v? `<span class="chip" style="margin:2px 12px 2px 0"><span class="dot" style="background:${CATCOLOR[k]}"></span>${CATS[k]}&nbsp;<b class="${v>0?'pos':'neg'}">${fmtRp(v)}</b></span>` : '';
  }).join('');
  $('#mdBalance').innerHTML =
    `<div style="font-size:22px;font-weight:750" class="pos">${fmtRp(accTot)}</div>
     <div class="hint">barang berpindah tangan secara netto selama ${n} hari bursa — <b>${idn(accTot/(totVal||1)*100,1)}%</b> dari nilai transaksi${accLotT?` · ≈ <b>${lotStr(accLotT)}</b>`:''}${totVol&&accLotT?` · ${idn(accLotT*100/totVol*100,1)}% dari volume`:''}</div>
     <h3>📥 Sisi akumulasi — ${accB.length} broker menampung</h3><div>${catLine(accB)||'—'}</div>
     <h3>📤 Sisi distribusi — ${disB.length} broker melepas</h3><div>${catLine(disB)||'—'}</div>
     <div class="hint" style="margin-top:8px">${accB.length<disB.length
       ? '→ Pembeli lebih terpusat daripada penjual: barang mengumpul di sedikit tangan (pola akumulasi).'
       : accB.length>disB.length
       ? '→ Penjual lebih terpusat daripada pembeli: sedikit tangan melepas ke banyak (pola distribusi).'
       : '→ Konsentrasi kedua sisi berimbang.'}</div>`;

  const consistBadge = a => {
    const side = a.net>0? a.daysPos : a.daysNeg;
    const txt = `${side}/${n} hari`;
    return (n>=2 && side>=Math.ceil(n*0.75)) ? `<b>${txt}</b> ✓` : txt;
  };
  const rowHTML = (b, isBuy) => `<tr>
    <td><b>${b.code}</b> <span class="hint">${nameOf(b.code)}</span></td>
    <td><span class="chip"><span class="dot" style="background:${CATCOLOR[b.cat]}"></span>${CATS[b.cat]}</span></td>
    <td class="num ${b.net>0?'pos':'neg'}">${fmtRp(b.net)}</td>
    <td class="num">${b.netLot? (b.netLot>0?'+':'−')+lotStr(b.netLot) : '—'}</td>
    <td class="num">${idn(Math.abs(b.net)/(totVal||1)*100,1)}%</td>
    <td class="num">${consistBadge(b)}</td>
    <td class="num">${isBuy? (b.bAvg?idn(b.bAvg,0):'—') : (b.sAvg?idn(b.sAvg,0):'—')}</td></tr>`;
  $('#mdBuyRows').innerHTML = buyers.map(b=>rowHTML(b,true)).join('') || '<tr><td colspan="7" class="empty">—</td></tr>';
  $('#mdSellRows').innerHTML = sellers.map(b=>rowHTML(b,false)).join('') || '<tr><td colspan="7" class="empty">—</td></tr>';

  $('#mdDayRows').innerHTML = daily.map(d=>{
    const chg = d.prev? (d.close-d.prev)/d.prev*100 : 0;
    return `<tr><td>${d.date}</td><td class="num">${idn(d.close,0)}</td>
      <td class="num ${chg>=0?'pos':'neg'}">${fmtPct(chg)}</td>
      <td class="num ${d.rec.catNet.ASING>=0?'pos':'neg'}">${fmtRp(d.rec.catNet.ASING)}</td>
      <td class="num ${d.rec.catNet.INSTITUSI>=0?'pos':'neg'}">${fmtRp(d.rec.catNet.INSTITUSI)}</td>
      <td class="num ${d.rec.catNet.RITEL>=0?'pos':'neg'}">${fmtRp(d.rec.catNet.RITEL)}</td>
      <td class="num"><b>${d.rec.score}</b></td><td>${d.rec.phaseIcon} ${d.rec.phase}</td></tr>`;
  }).join('');

  // vonis arah + alasan
  const reasons = [];
  const topC = buyers.slice(0,3), topD = sellers.slice(0,3);
  const consistC = topC.filter(b=>n>=2 && b.daysPos>=Math.ceil(n*0.75));
  const consistD = topD.filter(b=>n>=2 && b.daysNeg>=Math.ceil(n*0.75));
  for(const b of topC.slice(0,2))
    reasons.push(['🟦', `<b>${b.code}</b> (${CATS[b.cat]}) mengumpulkan <b>${fmtRp(b.net)}</b> — net buy ${b.daysPos}/${n} hari${b.daysPos>=Math.ceil(n*0.75)?' <b class="pos">→ akumulasi konsisten</b>':''}${b.bAvg?` · rata-rata beli ${idn(b.bAvg,0)}`:''}.`]);
  for(const b of topD.slice(0,2))
    reasons.push(['🟥', `<b>${b.code}</b> (${CATS[b.cat]}) membuang <b>${fmtRp(b.net)}</b> — net sell ${b.daysNeg}/${n} hari${b.daysNeg>=Math.ceil(n*0.75)?' <b class="neg">→ distribusi konsisten</b>':''}.`]);
  const top3Val = topC.reduce((s,b)=>s+b.net,0);
  const top3Lot = topC.reduce((s,b)=>s+(b.netLot||0),0);
  if(topC.length)
    reasons.push(['📦', `<b>Seberapa banyak:</b> top-${topC.length} collector menyerap total <b>${fmtRp(top3Val)}</b> = <b>${idn(top3Val/(totVal||1)*100,1)}%</b> dari seluruh nilai transaksi periode`
      + (top3Lot>0? `, ≈ <b>${lotStr(top3Lot)}</b>` : '')
      + (totVol && top3Lot>0? ` (${idn(top3Lot*100/totVol*100,1)}% dari volume periode)` : '')
      + `. Makin besar porsinya, makin besar &laquo;sebab&raquo; untuk mark-up berikutnya (hukum Cause &amp; Effect Wyckoff).`]);
  const cbTop = topC.filter(b=>b.bAvg && b.buy>0);
  if(cbTop.length){
    const cost = cbTop.reduce((s,b)=>s+b.bAvg*b.buy,0) / cbTop.reduce((s,b)=>s+b.buy,0);
    const dev = (last.close/cost-1)*100;
    const cbLot = cbTop.reduce((s,b)=>s+(b.netLot||0),0);
    reasons.push(['💰', `<b>Modal bandar:</b> harga rata-rata akumulasi collector utama ≈ <b>${idn(cost,0)}</b>; harga kini ${idn(last.close,0)} (<b class="${dev>=0?'pos':'neg'}">${fmtPct(dev)}</b> dari modal mereka). ${dev<=3
      ? 'Harga masih di sekitar/di bawah modal bandar — zona ini biasanya dipertahankan (support kuat) dan insentif mark-up masih besar.'
      : 'Harga sudah jauh di atas modal bandar — mereka bebas merealisasikan profit kapan saja; perketat stop loss.'}`
      + (cbLot>0? ` Estimasi posisi yang terkumpul: ${lotStr(cbLot)} ≈ <b>${fmtRp(cbLot*100*last.close)}</b> pada harga kini (floating ${fmtRp(cbLot*100*(last.close-cost))}).` : '')]);
  }
  if(aggRec.bigForeignSell && aggRec.priceChg>-1 && aggRec.catNet.INSTITUSI>0)
    reasons.push(['🛡️', `<b>Absorpsi:</b> asing net sell ${fmtRp(aggRec.catNet.ASING)} sepanjang periode tapi harga hanya ${fmtPct(aggRec.priceChg)} — diserap institusi lokal (${fmtRp(aggRec.catNet.INSTITUSI)}).`]);
  if(aggRec.catNet.RITEL < -0.03*aggRec.totalVal)
    reasons.push(['🧺', `Ritel net sell ${fmtRp(aggRec.catNet.RITEL)} — publik melepas ke tangan besar (khas fase akumulasi).`]);
  else if(aggRec.retailFomo)
    reasons.push(['🔥', `Ritel net buy besar (${fmtRp(aggRec.catNet.RITEL)}) — waspada euforia; ritel sering jadi exit liquidity institusi.`]);
  if(n>=4){
    const h1 = daily.slice(0,Math.floor(n/2)), h2 = daily.slice(Math.floor(n/2));
    const s1 = h1.reduce((s,d)=>s+d.rec.score,0)/h1.length, s2 = h2.reduce((s,d)=>s+d.rec.score,0)/h2.length;
    if(s2-s1>=6) reasons.push(['📈', `Momentum akumulasi <b>menguat</b>: skor paruh kedua (${Math.round(s2)}) > paruh pertama (${Math.round(s1)}).`]);
    else if(s1-s2>=6) reasons.push(['📉', `Momentum akumulasi <b>melemah</b>: skor paruh kedua (${Math.round(s2)}) < paruh pertama (${Math.round(s1)}).`]);
  }

  // profil perilaku broker + checklist kualitas akumulasi
  const profiles = brokerProfiles(r);
  const bqs = bandarQuality(r, profiles);
  $('#mdProf').innerHTML = profiles.slice(0,8).map(p=>`<tr>
    <td><b>${p.code}</b> <span class="hint">${nameOf(p.code)}</span></td>
    <td><span class="chip"><span class="dot" style="background:${CATCOLOR[p.cat]}"></span>${CATS[p.cat]}</span></td>
    <td>${p.ic} ${p.label}${p.flip?` <b class="${p.flip==='DIST'?'neg':'pos'}">🔄 → ${p.flip==='DIST'?'JUAL':'BELI'}</b>`:''}</td>
    <td class="num ${p.net>0?'pos':p.net<0?'neg':''}">${fmtRp(p.net)}</td>
    <td class="num">${idn(p.churn*100,0)}%</td>
    <td class="num">${p.buyRedPct!=null? idn(p.buyRedPct*100,0)+'%' : '—'}</td>
    <td class="num">${p.pricePos!=null? idn(p.pricePos*100,0)+'%' : '—'}</td></tr>`).join('')
    || '<tr><td colspan="7" class="empty">—</td></tr>';
  for(const p of profiles.filter(x=>x.flip).slice(0,3))
    reasons.push([p.flip==='DIST'?'⚠️':'🔄', `<b>${p.code}</b> (${CATS[p.cat]}) <b>berbalik arah</b> di paruh kedua periode: ${p.flip==='DIST'
      ? 'dari akumulasi menjadi <b class="neg">distribusi</b> — peringatan dini, collector mulai keluar'
      : 'dari distribusi menjadi <b class="pos">akumulasi</b> — pemain besar baru masuk'}.`]);
  $('#mdBqs').innerHTML =
    `<div class="row" style="margin-bottom:8px">
      <span style="font-size:34px;font-weight:750;color:${bqs.pct>=70?'var(--goodtext)':bqs.pct>=50?'var(--blue)':bqs.pct>=30?'var(--serious)':'var(--critical)'}">${bqs.grade}</span>
      <div><b>${bqs.pct}/100</b> — ${bqs.pct>=70?'akumulasi berkualitas tinggi, kandidat kuat mark-up':bqs.pct>=50?'akumulasi cukup sehat, butuh konfirmasi lanjutan':bqs.pct>=30?'sinyal lemah / campuran':'tidak ada jejak akumulasi berkualitas'}
      <div class="hint">${bqs.F.filter(f=>!f.na).length} faktor dinilai · ${bqs.F.filter(f=>f.na).length} tak tersedia datanya</div></div>
    </div>
    <ul class="insights">${bqs.F.map(f=>`<li data-ic="${f.na?'▫️':f.ok?'✅':'✗'}"><b>${f.name}</b> <span class="hint">(bobot ${f.w})</span> — ${f.desc}</li>`).join('')}</ul>`;

  // rating potensi pergerakan (heuristik + kualitas akumulasi + bukti historis)
  const dirUp = aggRec.score>=50;
  const strength = Math.min(1, Math.abs(aggRec.score-50)/30);
  const intensF = intens<1.5?0.6 : intens<4?1 : intens<8?1.4 : 1.8;
  const nConsist = dirUp? consistC.length : consistD.length;
  const composite = strength * intensF * (1 + 0.15*nConsist) * (dirUp? (0.75 + 0.5*bqs.pct/100) : 1);
  const midP = 8*composite;
  const loP = Math.max(0.5, midP*0.5), hiP = Math.min(30, midP*1.6);
  const stars = composite<0.25?1 : composite<0.5?2 : composite<0.85?3 : composite<1.25?4 : 5;
  let evid = '';
  const histRows = history[ticker]||[];
  if(histRows.length>=15){
    const parts = [];
    for(const h of [5,20]){
      let s=0,c=0,w=0;
      for(let i=0;i<histRows.length-h;i++){
        const sc = histRows[i].score??50;
        if(dirUp? sc>=62 : sc<=38){
          const f = histRows[i+h].close/histRows[i].close-1;
          s+=f; c++; if(dirUp? f>0 : f<0) w++;
        }
      }
      if(c>=3) parts.push(`H+${h}: rata-rata <b>${fmtPct(s/c*100)}</b> (${idn(w/c*100,0)}% searah, ${c} kejadian)`);
    }
    if(parts.length) evid = `<h3>📊 Bukti dari riwayat tersimpan (${histRows.length} hari)</h3><div class="hint">Setelah hari dengan skor ${dirUp?'≥62':'≤38'} di saham ini: ${parts.join(' · ')}</div>`;
  }
  $('#mdPotential').innerHTML = (aggRec.score>45 && aggRec.score<55)
    ? `<div style="font-size:19px;font-weight:700;color:var(--muted)">⚖️ Netral — belum bisa diproyeksikan</div>
       <div class="hint">Dominasi belum cukup kuat. Tambah beberapa hari data lagi untuk sinyal yang layak dihitung.</div>${evid}`
    : `<div style="font-size:24px;font-weight:750" class="${dirUp?'pos':'neg'}">${dirUp?'▲ +':'▼ −'}${idn(loP,1)}% s.d. ${dirUp?'+':'−'}${idn(hiP,1)}%</div>
       <div class="hint">estimasi ${dirUp?'kenaikan':'penurunan'} dalam ±20 hari bursa ke depan</div>
       <div style="font-size:19px;color:var(--yellow);margin-top:8px">${'★'.repeat(stars)}${'☆'.repeat(5-stars)} <span style="font-size:12.5px;color:var(--ink2)">keyakinan ${stars}/5</span></div>
       <div class="hint" style="margin-top:8px">Dihitung dari kekuatan skor (<b>${aggRec.score}</b>/100), intensitas ${dirUp?'akumulasi':'distribusi'} <b>${idn(intens,1)}%</b> (${intensLbl}), <b>${nConsist}</b> broker ${dirUp?'collector':'distributor'} konsisten${dirUp?`, dan kualitas akumulasi <b>${bqs.grade} (${bqs.pct}/100)</b>`:''}. <b>Heuristik probabilistik, bukan jaminan</b> — kalibrasi angkanya dengan 🔮 Uji Prediksi di tab Backtest.</div>
       ${evid}`;

  let outlook, oColor, oIcon;
  if(aggRec.score>=65 && consistC.length>=1){ outlook='KECENDERUNGAN NAIK — AKUMULASI KUAT & KONSISTEN'; oColor='var(--good)'; oIcon='📈'; }
  else if(aggRec.score>=55){ outlook='CENDERUNG NAIK — AKUMULASI MODERAT'; oColor='var(--blue)'; oIcon='↗'; }
  else if(aggRec.score<=35 && consistD.length>=1){ outlook='KECENDERUNGAN TURUN — DISTRIBUSI KUAT & KONSISTEN'; oColor='var(--critical)'; oIcon='📉'; }
  else if(aggRec.score<=45){ outlook='CENDERUNG TURUN — DISTRIBUSI MODERAT'; oColor='var(--serious)'; oIcon='↘'; }
  else { outlook='NETRAL — BELUM ADA DOMINASI JELAS'; oColor='var(--muted)'; oIcon='⚖️'; }
  const v = $('#mdVerdict');
  v.style.color = oColor; v.style.borderColor = oColor;
  v.innerHTML = `${oIcon} <b>${outlook}</b>&nbsp;<span class="hint" style="font-weight:400">— skor agregat ${aggRec.score}/100 dari ${n} hari. Probabilistik, bukan kepastian: validasi dengan tab 📐 Teknikal & ukur akurasinya di 🧪 Backtest setelah data disimpan ke Riwayat.</span>`;
  const ul = $('#mdReasons'); ul.innerHTML='';
  for(const [ic,html] of reasons){ const li=document.createElement('li'); li.dataset.ic=ic; li.innerHTML=html; ul.appendChild(li); }

  // grafik akumulasi kumulatif harian
  if(n>=2){
    const cSet = new Set(topC.map(b=>b.code));
    const dSet = new Set(topD.map(b=>b.code));
    let cc=0, dd=0, rr=0;
    const pts = daily.map(d=>{
      let c=0, s=0;
      for(const b of d.rec.brokers){ if(cSet.has(b.code)) c+=b.net; if(dSet.has(b.code)) s+=b.net; }
      cc+=c; dd+=s; rr+=d.rec.catNet.RITEL;
      return {date:d.date, coll:cc, dist:dd, rit:rr, close:d.close};
    });
    $('#mdLegend').innerHTML =
      `<span class="chip"><span class="dot" style="background:var(--pos)"></span>Collector (${topC.map(b=>b.code).join('+')||'—'}) kumulatif</span>`
      + `<span class="chip"><span class="dot" style="background:var(--neg)"></span>Distributor (${topD.map(b=>b.code).join('+')||'—'}) kumulatif</span>`
      + `<span class="chip"><span class="dot" style="background:var(--yellow)"></span>Ritel kumulatif</span>`;
    drawMDChart($('#chMD'), $('#ttMD'), pts);
    $('#mdChartCard').style.display = 'block';
  } else $('#mdChartCard').style.display = 'none';

  $('#mdOut').style.display = 'block';
}

function drawMDChart(box, tt, pts){
  const f = chartFrame(880,240,64,14,12,26);
  const vals = [0];
  for(const p of pts) vals.push(p.coll, p.dist, p.rit);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
  const y0 = ticks[0], y1 = ticks[ticks.length-1];
  const X = i => f.padL + (pts.length===1? f.iw/2 : i/(pts.length-1)*f.iw);
  const Y = v => f.padT + (1-(v-y0)/(y1-y0))*f.ih;
  let s = svgOpen(f);
  for(const tv of ticks){
    s += `<line x1="${f.padL}" x2="${f.W-f.padR}" y1="${Y(tv)}" y2="${Y(tv)}" stroke="${tv===0?cssVar('--baseline'):cssVar('--grid')}" stroke-width="${tv===0?1.5:1}"/>`;
    s += `<text x="${f.padL-8}" y="${Y(tv)+4}" text-anchor="end" font-size="10.5" fill="${cssVar('--muted')}">${fmtRp(tv).replace('Rp ','')}</text>`;
  }
  pts.forEach((p,i)=>{ s += `<text x="${X(i)}" y="${f.H-8}" text-anchor="middle" font-size="10.5" fill="${cssVar('--muted')}">${p.date.slice(5)}</text>`; });
  const series = [['coll','--pos'], ['dist','--neg'], ['rit','--yellow']];
  for(const [k, cvar] of series){
    const path = pts.map((p,i)=>`${X(i)},${Y(p[k])}`).join(' ');
    s += `<polyline points="${path}" fill="none" stroke="${cssVar(cvar)}" stroke-width="2" stroke-linejoin="round"/>`;
    pts.forEach((p,i)=>{ s += `<circle cx="${X(i)}" cy="${Y(p[k])}" r="3" fill="${cssVar(cvar)}" stroke="${cssVar('--surface')}" stroke-width="2"/>`; });
  }
  s += '</svg>';
  box.querySelector('svg')?.remove();
  box.insertAdjacentHTML('beforeend', s);
  hookTooltip(box, tt, pts, f, i=>`<b>${pts[i].date}</b><br>Collector: ${fmtRp(pts[i].coll)}<br>Distributor: ${fmtRp(pts[i].dist)}<br>Ritel: ${fmtRp(pts[i].rit)}<br>Close: ${idn(pts[i].close,0)}`);
}

function mdSaveToHistory(){
  if(!mdResult) return 0;
  const arr = history[mdResult.ticker] ??= [];
  for(const d of mdResult.daily){
    const entry = {date:d.date, close:d.close, prev:d.prev, vol:d.vol, score:d.rec.score, phase:d.rec.phase,
      netF:d.rec.catNet.ASING, netI:d.rec.catNet.INSTITUSI, netR:d.rec.catNet.RITEL, totalVal:d.rec.totalVal};
    const i = arr.findIndex(x=>x.date===d.date);
    if(i>=0) arr[i]=entry; else arr.push(entry);
  }
  arr.sort((a,b)=>a.date.localeCompare(b.date));
  saveHist();
  return mdResult.daily.length;
}
$('#btnMDSave').onclick = ()=>{
  const k = mdSaveToHistory();
  if(k) $('#mdSaveMsg').innerHTML = `✅ ${k} hari <b>${mdResult.ticker}</b> tersimpan — buka 📈 Riwayat untuk tren, 🧪 Backtest / 🔮 Uji Prediksi untuk uji akurasi.`;
};
$('#btnMDCsv').onclick = ()=>{
  if(!mdResult) return;
  const r = mdResult, L = [];
  L.push(`MULTI-HARI;${r.ticker};${r.from};${r.to}`);
  L.push('');
  L.push('RINCIAN HARIAN');
  L.push('tanggal;close;chg%;netAsing;netInstitusi;netRitel;score;fase');
  for(const d of r.daily){
    const chg = d.prev? (d.close-d.prev)/d.prev*100 : 0;
    L.push([d.date, d.close, chg.toFixed(2), Math.round(d.rec.catNet.ASING), Math.round(d.rec.catNet.INSTITUSI),
      Math.round(d.rec.catNet.RITEL), d.rec.score, d.rec.phase].join(';'));
  }
  L.push('');
  L.push('AGREGAT PER BROKER');
  L.push('broker;kategori;buy;sell;net;netLot;hariNetBuy;hariNetSell;avgBeli;avgJual');
  for(const b of [...r.aggBrokers].sort((a,c)=>c.net-a.net))
    L.push([b.code, CATS[b.cat], Math.round(b.buy), Math.round(b.sell), Math.round(b.net), b.netLot||0,
      b.daysPos, b.daysNeg, b.bAvg?Math.round(b.bAvg):'', b.sAvg?Math.round(b.sAvg):''].join(';'));
  const blob = new Blob(["﻿"+L.join('\r\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `multihari-${r.ticker}-${r.from}-${r.to}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
};

/* ---------- Impor CSV IPOT (format dua kolom: buyer & seller sejajar per baris) ---------- */
function looksIpotDual(text){
  if(/\bBLot\b/i.test(text) && /\bSLot\b/i.test(text)) return true;
  let dual = 0;
  for(const line of text.split(/\r?\n/).slice(0,40)){
    const toks = line.trim().split(/\s+/).filter(Boolean);
    if(toks.filter(t=>/^[A-Z]{2}$/.test(t)).length>=2 && toks.length>=7) dual++;
  }
  return dual>=2;
}

function parseIpotDual(text){
  const out = {buy:[], sell:[], ticker:null, dateStart:null, dateEnd:null};
  const okC = c => /^[A-Z]{2,3}$/.test(c);
  const numOf = t => { const p = parseNumToken(String(t??''), 1e6); return (p && !p.hadSuffix) ? p.val : (p? p.val : null); };
  const mkRow = (code, nums) => {
    nums = nums.filter(v=>v!=null);
    if(!code || nums.length<2) return null;
    const [lot, val, avg] = nums;
    if(!(val>0)) return null;
    return {code, lot:lot||0, val, avg:avg||null};
  };
  for(const raw of text.split(/\r?\n/)){
    if(!raw.trim()) continue;
    if(/start/i.test(raw)){
      const mT = raw.match(/\b([A-Z]{4})\b/);
      const mD = raw.match(/Start\s+(\d{4}-\d{2}-\d{2})(?:[\s\S]*?End\s+(\d{4}-\d{2}-\d{2}))?/i);
      if(mD){ if(mT) out.ticker = mT[1]; out.dateStart = mD[1]; out.dateEnd = mD[2]||null; continue; }
    }
    if(/\bBLot\b/i.test(raw) || /\bSLot\b/i.test(raw)) continue; // baris judul kolom
    // jalur posisi (ekspor asli IPOT dipisah tab: 4 kolom buyer, kolom rank, 4 kolom seller)
    if(raw.includes('\t')){
      const cells = raw.split('\t').map(s=>s.trim());
      if(cells.length>=9){
        const bc = (cells[0]||'').toUpperCase(), sc = (cells[5]||'').toUpperCase();
        const b = okC(bc)? mkRow(bc, [numOf(cells[1]), numOf(cells[2]), numOf(cells[3])]) : null;
        const s = okC(sc)? mkRow(sc, [numOf(cells[6]), numOf(cells[7]), numOf(cells[8])]) : null;
        if(b) out.buy.push(b);
        if(s) out.sell.push(s);
        if(b||s) continue;
      }
    }
    // jalur cadangan (tempelan tanpa tab): cari dua kode broker per baris
    const toks = raw.trim().split(/\s+/).filter(Boolean);
    const codeIdx = [];
    toks.forEach((t,i)=>{ if(/^[A-Z]{2}$/.test(t)) codeIdx.push(i); });
    if(!codeIdx.length) continue;
    const i1 = codeIdx[0];
    const i2 = codeIdx.find(i=>i>i1+2) ?? null;
    const numsIn = (a,b)=> toks.slice(a+1, b??toks.length).map(numOf);
    if(i2!=null){
      const b = mkRow(toks[i1], numsIn(i1,i2));
      const s = mkRow(toks[i2], numsIn(i2,null));
      if(b) out.buy.push(b);
      if(s) out.sell.push(s);
    } else {
      const before = toks.slice(0,i1).map(numOf).filter(v=>v!=null);
      const g = mkRow(toks[i1], numsIn(i1,null));
      if(g) (before.length? out.sell : out.buy).push(g);
    }
  }
  return out;
}

const bsRowStr = r => r.avg? `${r.code}\t${r.lot||0}\t${r.val}\t${r.avg}`
  : (r.lot? `${r.code}\t${r.lot}\t${r.val}` : `${r.code}\t${r.val}`);

function applyIpotToInput(r){
  $('#inBuy').value = r.buy.map(bsRowStr).join('\n');
  $('#inSell').value = r.sell.map(bsRowStr).join('\n');
  $('#inUnit').value = '1';
  if(r.ticker){ $('#inTicker').value = r.ticker; $('#inTicker').dispatchEvent(new Event('input')); }
  if(r.dateStart) $('#inDate').value = r.dateStart;
  $('#broksumMsg').innerHTML = `✅ Impor IPOT: <b>${r.buy.length}</b> buyer · <b>${r.sell.length}</b> seller`
    + (r.ticker? ` · ${r.ticker}`:'') + (r.dateStart? ` · ${r.dateStart}`:'')
    + (r.dateEnd && r.dateEnd!==r.dateStart? ` <span style="color:var(--serious)">(file mencakup ${r.dateStart} s.d. ${r.dateEnd} — dicatat sebagai ${r.dateStart})</span>`:'')
    + ' — klik 🔎 Analisis Sekarang.';
}

$('#btnImportIpot').onclick = ()=> $('#fileIpot').click();
$('#fileIpot').onchange = e=>{
  const f = e.target.files[0]; if(!f) return;
  const fr = new FileReader();
  fr.onload = ()=>{
    const r = parseIpotDual(fr.result);
    if(!r.buy.length && !r.sell.length) return alert('Format file tidak dikenali sebagai broker summary IPOT (butuh kolom BY/BLot/BVal & SL/SLot/SVal).');
    applyIpotToInput(r);
  };
  fr.readAsText(f); e.target.value='';
};

// tempel mentahan IPOT ke kolom buyer/seller mana pun → otomatis dipisah dua sisi
for(const id of ['inBuy','inSell']){
  $('#'+id).addEventListener('paste', e=>{
    const text = (e.clipboardData||window.clipboardData).getData('text');
    if(!looksIpotDual(text)) return;
    e.preventDefault();
    applyIpotToInput(parseIpotDual(text));
  });
}

// Multi-Hari: tempel IPOT ke blok hari → isi buyer+seller+tanggal blok itu
$('#mdDays').addEventListener('paste', e=>{
  const ta = e.target.closest('textarea'); if(!ta) return;
  const text = (e.clipboardData||window.clipboardData).getData('text');
  if(!looksIpotDual(text)) return;
  e.preventDefault();
  const r = parseIpotDual(text);
  const day = ta.closest('.mdday');
  day.querySelector('.mdbuy').value = r.buy.map(bsRowStr).join('\n');
  day.querySelector('.mdsell').value = r.sell.map(bsRowStr).join('\n');
  if(r.dateStart) day.querySelector('.mddate').value = r.dateStart;
  if(r.ticker && !$('#mdTicker').value) $('#mdTicker').value = r.ticker;
  $('#inUnit').value = '1';
});

// Multi-Hari: impor banyak file IPOT sekaligus (1 file = 1 blok hari)
$('#btnMDImport').onclick = ()=> $('#fileMDIpot').click();
$('#fileMDIpot').onchange = async e=>{
  const files = [...e.target.files]; if(!files.length) return;
  const parsed = [];
  for(const f of files){
    const text = await f.text();
    const r = parseIpotDual(text);
    if(r.buy.length || r.sell.length) parsed.push({name:f.name, r});
  }
  e.target.value='';
  if(!parsed.length) return alert('Tidak ada file yang dikenali sebagai broker summary IPOT.');
  parsed.sort((a,b)=> (a.r.dateStart||a.name).localeCompare(b.r.dateStart||b.name));
  for(const {r} of parsed){
    mdAddDay();
    const day = $('#mdDays').lastElementChild;
    day.querySelector('.mdbuy').value = r.buy.map(bsRowStr).join('\n');
    day.querySelector('.mdsell').value = r.sell.map(bsRowStr).join('\n');
    if(r.dateStart) day.querySelector('.mddate').value = r.dateStart;
    if(r.ticker && !$('#mdTicker').value) $('#mdTicker').value = r.ticker;
  }
  $('#inUnit').value = '1';
  $('#mdStatus').textContent = `✅ ${parsed.length} file IPOT diimpor menjadi ${parsed.length} blok hari — periksa tanggalnya lalu klik 📅 Analisis Multi-Hari.`;
};

/* ---------- Cache broksum (hemat kuota — 1 tanggal hanya diambil sekali) ---------- */
function fetchBroksumCached(t, date, key){
  try{
    const c = JSON.parse(localStorage.getItem(`bdm_bs_${t}_${date}`));
    if(c && Array.isArray(c.buy) && (c.buy.length || c.sell.length))
      return Promise.resolve({...c, fromCache:true});
  }catch(e){}
  return fetchBroksum(t, date, key).then(v=>{
    if(v.buy.length || v.sell.length){
      try{ localStorage.setItem(`bdm_bs_${t}_${date}`, JSON.stringify(v)); }catch(e){}
    }
    return v;
  });
}

/* ---------- Uji Prediksi Walk-Forward ---------- */
function wfVerdict(win){
  const W = win.length;
  const avgScore = win.reduce((s,d)=>s+d.score,0)/W;
  const smartPos = win.filter(d=>(d.netF+d.netI)>0).length;
  const smartNeg = win.filter(d=>(d.netF+d.netI)<0).length;
  if(avgScore>=62 && smartPos>=Math.ceil(W*0.75)) return {dir:'NAIK', label:'📈 NAIK (kuat)'};
  if(avgScore>=55) return {dir:'NAIK', label:'↗ NAIK'};
  if(avgScore<=38 && smartNeg>=Math.ceil(W*0.75)) return {dir:'TURUN', label:'📉 TURUN (kuat)'};
  if(avgScore<=45) return {dir:'TURUN', label:'↘ TURUN'};
  return {dir:'NETRAL', label:'⚖️ NETRAL'};
}

$('#wfSource').onchange = ()=>{
  const online = $('#wfSource').value==='online';
  $('#wfTickerWrap').style.display = online? 'none':'block';
  $('#wfOnTickerWrap').style.display = online? 'block':'none';
  $$('.wfDate').forEach(el=> el.style.display = online? 'block':'none');
};

$('#btnRunWF').onclick = async ()=>{
  const W = Math.max(1, Math.floor(+$('#wfW').value)||3);
  const h = Math.max(1, Math.floor(+$('#wfH').value)||5);
  const src = $('#wfSource').value;
  const st = $('#wfStatus'), btn = $('#btnRunWF');
  btn.disabled = true;
  try{
    let series = [], label = '';
    if(src==='hist'){
      const t = $('#wfTicker').value; label = t;
      const rows = history[t]||[];
      if(rows.length < W+h+1) throw new Error(`riwayat ${t||'(kosong)'} berisi ${rows.length} hari — butuh ≥ ${W+h+1}. Simpan rentang lebih panjang lewat 📅 Multi-Hari dulu.`);
      series = rows.map(r=>({date:r.date, close:r.close, score:(r.score??50), netF:r.netF||0, netI:r.netI||0}));
    } else {
      const t = normTicker($('#wfOnTicker').value); label = t;
      const from = $('#wfFrom').value, to = $('#wfTo').value;
      const key = $('#goapiKey').value.trim();
      if(!/^[A-Z]{4}$/.test(t)) throw new Error('isi kode saham dulu.');
      if(!from || !to || from>to) throw new Error('rentang tanggal anchor tidak valid.');
      if(!key) throw new Error('API key GoAPI belum diisi (tab 📥 Input Data).');
      st.textContent = '⏳ Mengambil harga…';
      const {rows:prows} = await fetchYahoo(t, '1y');
      const iFrom = prows.findIndex(r=>r.date>=from);
      let iTo = -1; for(let i=prows.length-1;i>=0;i--){ if(prows[i].date<=to){ iTo=i; break; } }
      if(iFrom<0 || iTo<0 || iFrom>iTo) throw new Error('rentang anchor di luar data harga.');
      const startNeed = Math.max(0, Math.max(iFrom, W-1) - (W-1));
      const needDates = prows.slice(startNeed, iTo+1).map(r=>r.date);
      let fresh = 0;
      const recMap = {};
      for(let i=0;i<needDates.length;i++){
        const date = needDates[i];
        const cached = localStorage.getItem(`bdm_bs_${t}_${date}`);
        if(!cached){
          fresh++;
          if(fresh>25) throw new Error(`butuh >25 request API baru — persempit rentang, atau jalankan bertahap (hari yang sudah diambil otomatis ter-cache).`);
        }
        st.textContent = `⏳ Broksum ${date} (${i+1}/${needDates.length})${cached?' · cache':''}…`;
        let bs;
        try{ bs = await fetchBroksumCached(t, date, key); }catch(e){ continue; }
        if(!bs.buy.length && !bs.sell.length) continue;
        const m = {};
        bs.buy.forEach(r=>{ (m[r.code] ??= {buy:0,sell:0,bAvg:null,sAvg:null}).buy += r.val; if(r.avg) m[r.code].bAvg=r.avg; });
        bs.sell.forEach(r=>{ (m[r.code] ??= {buy:0,sell:0,bAvg:null,sAvg:null}).sell += r.val; if(r.avg) m[r.code].sAvg=r.avg; });
        const pi = prows.findIndex(r=>r.date===date);
        const prev = pi>0? prows[pi-1].close : prows[pi].close;
        const rec = computeDay(Object.entries(m).map(([code,o])=>({code,...o})), prev, prows[pi].close);
        recMap[date] = {score:rec.score, netF:rec.catNet.ASING, netI:rec.catNet.INSTITUSI};
      }
      series = prows.map(r=> recMap[r.date]
        ? {date:r.date, close:r.close, ...recMap[r.date]}
        : {date:r.date, close:r.close, score:null, netF:0, netI:0});
    }
    // jalan maju: verdict dari jendela W, dinilai dengan return h langkah ke depan
    const fromF = src==='online'? $('#wfFrom').value : null;
    const toF = src==='online'? $('#wfTo').value : null;
    const anchors = [];
    for(let i=W-1; i<series.length-h; i++){
      const d = series[i].date;
      if(fromF && d<fromF) continue;
      if(toF && d>toF) continue;
      const win = series.slice(i-W+1, i+1);
      if(win.some(x=>x.score==null)) continue;
      const v = wfVerdict(win);
      anchors.push({date:d, v,
        avgScore: Math.round(win.reduce((s,x)=>s+x.score,0)/W),
        fwd: series[i+h].close/series[i].close - 1,
        fwdDate: series[i+h].date});
    }
    if(!anchors.length) throw new Error('tidak ada titik uji valid (jendela/horizon terlalu besar untuk data yang ada?).');
    renderWF(anchors, label, W, h);
    st.textContent = `✅ ${anchors.length} titik uji dievaluasi (${label}, W=${W}, h=${h}).`;
  }catch(e){
    st.textContent = '❌ '+e.message;
    $('#wfOut').style.display = 'none';
  }
  btn.disabled = false;
};

function renderWF(anchors, label, W, h){
  const naik = anchors.filter(a=>a.v.dir==='NAIK');
  const turun = anchors.filter(a=>a.v.dir==='TURUN');
  const netral = anchors.filter(a=>a.v.dir==='NETRAL');
  const okN = naik.filter(a=>a.fwd>0).length;
  const okT = turun.filter(a=>a.fwd<0).length;
  const avg = arr => arr.length? arr.reduce((s,a)=>s+a.fwd,0)/arr.length : null;
  const card = (l,v,d,cls='')=>`<div class="card statcard"><div class="lbl">${l}</div><div class="val ${cls}">${v}</div><div class="det">${d}</div></div>`;
  $('#wfCards').innerHTML =
    card('Titik Uji', anchors.length, `${label} · verdict dari W=${W} hari, dinilai h=${h} hari kemudian`)
    + card('Verdict NAIK', naik.length? `${idn(okN/naik.length*100,0)}%` : '—',
        naik.length? `benar ${okN}/${naik.length} · rata-rata ${fmtPct(avg(naik)*100)}` : 'tidak ada', naik.length&&okN/naik.length>=0.55?'pos':'')
    + card('Verdict TURUN', turun.length? `${idn(okT/turun.length*100,0)}%` : '—',
        turun.length? `benar ${okT}/${turun.length} · rata-rata ${fmtPct(avg(turun)*100)}` : 'tidak ada', turun.length&&okT/turun.length>=0.55?'pos':'')
    + card('NETRAL (tak dinilai)', netral.length, netral.length? `rata-rata ${fmtPct(avg(netral)*100)}` : '—');
  const dir = naik.length+turun.length, ok = okN+okT;
  const v = $('#wfVerdict');
  if(!dir){
    v.style.color='var(--muted)'; v.style.borderColor='var(--muted)';
    v.innerHTML = '⚖️ Semua verdict NETRAL — tidak ada prediksi berarah yang bisa dinilai. Coba jendela W atau rentang lain.';
  } else {
    const pct = ok/dir*100;
    const good = pct>=55 && dir>=5;
    v.style.color = good? 'var(--goodtext)' : dir<5? 'var(--serious)' : pct>=45? 'var(--muted)' : 'var(--critical)';
    v.style.borderColor = good? 'var(--good)' : dir<5? 'var(--serious)' : pct>=45? 'var(--muted)' : 'var(--critical)';
    v.innerHTML = `${good?'✅':dir<5?'⚠️':pct>=45?'➖':'⛔'} Dari <b>${dir}</b> verdict berarah, <b>${ok} benar (${idn(pct,0)}%)</b> pada horizon ${h} hari.` +
      (dir<5? ' Sampel masih kecil — simpan/uji rentang lebih panjang sebelum percaya angkanya.' :
       good? ' Analisis multi-hari terbukti berguna pada data ini — tetap bukan jaminan masa depan.' :
       ' Belum lebih baik dari lempar koin pada data ini — coba jendela W berbeda atau periksa kualitas data.');
  }
  $('#wfRows').innerHTML = anchors.map(a=>{
    const res = a.v.dir==='NETRAL' ? '—' : ((a.v.dir==='NAIK') === (a.fwd>0) ? '✅ benar' : '❌ salah');
    return `<tr><td>${a.date}</td><td>${a.v.label}</td><td class="num">${a.avgScore}</td>
      <td class="num ${a.fwd>0?'pos':'neg'}">${fmtPct(a.fwd*100)} <span class="hint">(s.d. ${a.fwdDate})</span></td>
      <td>${res}</td></tr>`;
  }).join('');
  $('#wfOut').style.display = 'block';
}

/* ---------- Analisis Teknikal ---------- */
function smaArr(a,p){const o=new Array(a.length).fill(null);let s=0;
  for(let i=0;i<a.length;i++){s+=a[i];if(i>=p)s-=a[i-p];if(i>=p-1)o[i]=s/p;}return o;}
function emaArr(a,p){const o=new Array(a.length).fill(null);const k=2/(p+1);let e=null,s=0;
  for(let i=0;i<a.length;i++){if(i<p-1){s+=a[i];continue;}if(i===p-1){s+=a[i];e=s/p;}else e=a[i]*k+e*(1-k);o[i]=e;}return o;}
function rsiArr(a,p=14){const o=new Array(a.length).fill(null);let g=0,l=0;
  for(let i=1;i<a.length;i++){const ch=a[i]-a[i-1],up=Math.max(ch,0),dn=Math.max(-ch,0);
    if(i<=p){g+=up;l+=dn;if(i===p){g/=p;l/=p;o[i]=100-100/(1+(l===0?1e9:g/l));}}
    else{g=(g*(p-1)+up)/p;l=(l*(p-1)+dn)/p;o[i]=100-100/(1+(l===0?1e9:g/l));}}return o;}
function macdCalc(a){const f=emaArr(a,12),s=emaArr(a,26);
  const m=a.map((_,i)=>(f[i]!=null&&s[i]!=null)?f[i]-s[i]:null);
  const sig=new Array(a.length).fill(null);const k=2/10;let e=null,cnt=0,sum=0;
  for(let i=0;i<a.length;i++){if(m[i]==null)continue;cnt++;
    if(cnt<9){sum+=m[i];continue;}if(cnt===9){sum+=m[i];e=sum/9;}else e=m[i]*k+e*(1-k);sig[i]=e;}
  return {m,sig};}
function bollCalc(a,p=20,mult=2){const mid=smaArr(a,p);
  const up=new Array(a.length).fill(null),lo=new Array(a.length).fill(null);
  for(let i=p-1;i<a.length;i++){let s=0;for(let j=i-p+1;j<=i;j++)s+=(a[j]-mid[i])**2;
    const sd=Math.sqrt(s/p);up[i]=mid[i]+mult*sd;lo[i]=mid[i]-mult*sd;}return{mid,up,lo};}
function findSwings(c,k=3){const hi=[],lo=[];
  for(let i=k;i<c.length-k;i++){let mx=true,mn=true;
    for(let j=i-k;j<=i+k;j++){if(c[j]>c[i])mx=false;if(c[j]<c[i])mn=false;}
    if(mx)hi.push({i,v:c[i]});if(mn)lo.push({i,v:c[i]});}return{hi,lo};}
function clusterLevels(pts,tol=0.015){const s=[...pts].sort((a,b)=>a.v-b.v);const out=[];
  for(const p of s){const g=out[out.length-1];
    if(g && (p.v-g.v)/g.v<=tol){g.v=(g.v*g.n+p.v)/(g.n+1);g.n++;}else out.push({v:p.v,n:1});}
  return out;}

async function tkSeriesGet(){
  const src=$('#tkSource').value;
  if(src==='online'){
    const t = normTicker($('#tkName').value);
    if(!/^[A-Z]{4}$/.test(t)) throw new Error('Isi kode saham dulu di kolom "Kode saham" (mis. BBRI).');
    const {rows} = await fetchYahoo(t, '1y');
    return {rows: rows.map(r=>({date:r.date, close:r.close})), label:t};
  }
  if(src==='demo') return {rows:genSynthetic(), label:'SINTETIS'};
  if(src==='hist'){
    const t=$('#tkTicker').value;
    return {rows:(history[t]||[]).map(r=>({date:r.date, close:r.close})), label:t||'-'};
  }
  const rows=[];
  for(const raw of $('#tkCSV').value.split(/\r?\n/)){
    const line=raw.trim(); if(!line) continue;
    let toks;
    if(line.includes('\t')) toks=line.split(/\t+/);
    else if(line.includes(';')) toks=line.split(/;+/);
    else toks=line.split(/,/);
    toks=toks.map(t=>t.trim()).filter(Boolean);
    if(toks.length<2) continue;
    const date=normDate(toks[0]); if(!date) continue;
    const p=parseNumToken(toks[1], 1e6); if(!p || !(p.val>0)) continue;
    rows.push({date, close:p.val});
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  return {rows, label: normTicker($('#tkName').value)||'CSV'};
}

async function runTeknikal(){
  const btn = $('#btnRunTK');
  btn.disabled = true; btn.textContent = '⏳ Mengambil data…';
  let rows, label;
  try{ ({rows,label} = await tkSeriesGet()); }
  catch(e){ btn.disabled=false; btn.textContent='📐 Analisis Teknikal'; return alert('Gagal: '+e.message); }
  btn.disabled = false; btn.textContent = '📐 Analisis Teknikal';
  if(rows.length<30) return alert(`Butuh minimal 30 hari data harga (saat ini ${rows.length}). Untuk MA200 idealnya 200+ hari.`);
  const c = rows.map(r=>r.close), n=c.length, price=c[n-1];
  const ma20=smaArr(c,20), ma50=smaArr(c,50), ma200=smaArr(c,200);
  const rsi=rsiArr(c,14), {m:mc,sig:ms}=macdCalc(c), bb=bollCalc(c);
  const chgTot=(price/c[0]-1)*100, hiAll=Math.max(...c), loAll=Math.min(...c);

  // support-resistance dari swing
  const {hi,lo}=findSwings(c,3);
  const levels=clusterLevels([...hi,...lo]);
  const sup=levels.filter(g=>g.v<=price*0.995).sort((a,b)=>b.v-a.v).slice(0,3);
  const res=levels.filter(g=>g.v>=price*1.005).sort((a,b)=>a.v-b.v).slice(0,3);
  const fibs=[23.6,38.2,50,61.8].map(p=>({p, v:loAll+(hiAll-loAll)*p/100}));

  // pola: double bottom & higher lows
  let db=null;
  const recentLo=lo.filter(l=>l.i>=n-120);
  for(let a=0;a<recentLo.length-1;a++) for(let b=a+1;b<recentLo.length;b++){
    const l1=recentLo[a], l2=recentLo[b];
    if(l2.i-l1.i>=8 && Math.abs(l2.v-l1.v)/l1.v<=0.03){
      const peak=Math.max(...c.slice(l1.i,l2.i+1));
      if(peak>=Math.min(l1.v,l2.v)*1.04) db={l1,l2,neck:peak,valid:price>peak};
    }
  }
  const last3=lo.slice(-3);
  const higherLows = last3.length===3 && last3[0].v<last3[1].v && last3[1].v<last3[2].v;

  // rating keyakinan
  let pts=0; const why=[];
  const add=(p,t)=>{pts+=p; why.push([p>0?'✅':p<0?'⛔':'▫️', `${t} <b class="${p>0?'pos':p<0?'neg':''}">(${p>0?'+':''}${p})</b>`]);};
  if(ma50[n-1]!=null) add(price>ma50[n-1]?1:-1, `Harga ${price>ma50[n-1]?'di atas':'di bawah'} MA50 (${idn(ma50[n-1],0)})`);
  if(ma200[n-1]!=null){
    add(price>ma200[n-1]?2:-2, `Harga ${price>ma200[n-1]?'di atas':'di bawah'} MA200 (${idn(ma200[n-1],0)})`);
    if(ma50[n-1]!=null) add(ma50[n-1]>ma200[n-1]?2:-2, ma50[n-1]>ma200[n-1]?'Golden Cross aktif (MA50 > MA200)':'Death Cross aktif (MA50 < MA200)');
  }
  const rv=rsi[n-1];
  if(rv!=null){
    if(rv<30) add(1,`RSI ${idn(rv,0)} — oversold, potensi rebound`);
    else if(rv<=65) add(1,`RSI ${idn(rv,0)} — netral, masih ada ruang naik`);
    else if(rv<=75) add(0,`RSI ${idn(rv,0)} — mulai jenuh beli`);
    else add(-1,`RSI ${idn(rv,0)} — overbought`);
  }
  if(mc[n-1]!=null && ms[n-1]!=null){
    if(mc[n-1]>ms[n-1] && mc[n-1]>0) add(2,`MACD positif di atas garis sinyal (${idn(mc[n-1],2)})`);
    else if(mc[n-1]>ms[n-1]) add(1,'MACD di atas garis sinyal (masih zona negatif)');
    else add(-1,'MACD di bawah garis sinyal — momentum lemah');
  }
  if(bb.mid[n-1]!=null) add(price>bb.mid[n-1]?1:0, `Harga ${price>bb.mid[n-1]?'di atas':'di bawah'} pita tengah Bollinger`);
  if(db) add(db.valid?2:1, db.valid?`Double bottom TERVALIDASI (neckline ${idn(db.neck,0)} ditembus)`:`Double bottom terbentuk (neckline ${idn(db.neck,0)} belum ditembus)`);
  if(higherLows) add(1,'Struktur higher lows — dasar semakin meninggi');
  if(lastResult && lastResult.ticker===label){
    if(lastResult.score>=62) add(2,`Bandar Score ${lastResult.score} — akumulasi broker terdeteksi`);
    else if(lastResult.score<=38) add(-2,`Bandar Score ${lastResult.score} — distribusi broker terdeteksi`);
  }
  let rating, rColor, rIcon;
  if(pts>=8){rating='STRONG BUY (AKUMULASI KUAT)';rColor='var(--good)';rIcon='🚀';}
  else if(pts>=5){rating='BUY';rColor='var(--blue)';rIcon='📈';}
  else if(pts>=2){rating='NETRAL — CENDERUNG POSITIF';rColor='var(--muted)';rIcon='🌤';}
  else if(pts>=-1){rating='NETRAL / TUNGGU';rColor='var(--muted)';rIcon='⏳';}
  else {rating='HINDARI / SELL';rColor='var(--critical)';rIcon='⛔';}

  // kartu atas
  $('#tkTop').innerHTML =
    `<div class="card statcard"><div class="lbl">Rating Keyakinan · ${label}</div>
      <div class="val" style="margin-top:8px"><span class="badge" style="color:${rColor};border-color:${rColor}">${rIcon} ${rating}</span></div>
      <div class="det">Total poin: <b>${pts}</b> dari ${why.length} faktor teknikal${lastResult&&lastResult.ticker===label?' + bandarmologi':''}</div></div>
    <div class="card statcard"><div class="lbl">Pola Grafik</div>
      <div class="val" style="font-size:16px;margin-top:6px">${db? (db.valid?'✅ Double Bottom (tervalidasi)':'🟡 Double Bottom (terbentuk)') : higherLows? '🟢 Higher Lows (uptrend minor)' : '— Tidak ada pola dominan'}</div>
      <div class="det">${db? `Kaki: ${idn(db.l1.v,0)} & ${idn(db.l2.v,0)} · neckline ${idn(db.neck,0)}${db.valid?' — target teoritis '+idn(db.neck+(db.neck-Math.min(db.l1.v,db.l2.v)),0):''}` : higherLows? `Dasar naik: ${last3.map(l=>idn(l.v,0)).join(' → ')}` : 'Pantau pembentukan basis di area support'}</div></div>
    <div class="card statcard"><div class="lbl">Ringkasan Periode (${n} hari)</div>
      <div class="val">Rp ${idn(price,0)} <span style="font-size:14px" class="${chgTot>=0?'pos':'neg'}">${fmtPct(chgTot)}</span></div>
      <div class="det">Tertinggi ${idn(hiAll,0)} · Terendah ${idn(loAll,0)} · ${rows[0].date} → ${rows[n-1].date}</div></div>`;

  // pembacaan indikator
  const ind=[];
  ind.push(['📏', `<b>Moving Average:</b> harga ${idn(price,0)}${ma20[n-1]!=null?` · MA20 ${idn(ma20[n-1],0)}`:''}${ma50[n-1]!=null?` · MA50 ${idn(ma50[n-1],0)}`:''}${ma200[n-1]!=null?` · MA200 ${idn(ma200[n-1],0)}`:' · MA200 butuh 200 hari data'}. ${ma50[n-1]!=null&&ma200[n-1]!=null? (ma50[n-1]>ma200[n-1]?'Status: <b class="pos">Golden Cross</b> — tren utama bullish.':'Status: <b class="neg">Death Cross</b> — harga perlu menembus MA200 untuk pembalikan.') : ''}`]);
  if(rv!=null) ind.push(['⚡', `<b>RSI-14: ${idn(rv,1)}.</b> ${rv<30?'Jenuh jual (oversold) — tekanan turun sudah ekstrem, rawan rebound.':rv<=55?'Zona seimbang — masih ada ruang akselerasi panjang tanpa jenuh beli.':rv<=70?'Momentum naik sehat, mendekati area jenuh.':'Jenuh beli (overbought) — rawan koreksi.'}`]);
  if(mc[n-1]!=null&&ms[n-1]!=null) ind.push(['🚦', `<b>MACD: ${idn(mc[n-1],2)}</b> vs sinyal ${idn(ms[n-1],2)}. ${mc[n-1]>ms[n-1]? (mc[n-1]>0?'<b class="pos">Buy signal</b> — garis cepat di atas sinyal & zona positif; dorongan pembeli mendominasi.':'Persilangan bullish di zona negatif — pemulihan tahap awal.') : '<b class="neg">Momentum melemah</b> — garis cepat di bawah sinyal.'}`]);
  if(bb.mid[n-1]!=null) ind.push(['🎈', `<b>Bollinger Bands:</b> pita bawah ${idn(bb.lo[n-1],0)} · tengah ${idn(bb.mid[n-1],0)} · atas ${idn(bb.up[n-1],0)}. ${price>bb.up[n-1]?'Harga menembus pita atas — momentum kuat tapi rawan jeda.':price>bb.mid[n-1]?`Harga di atas pita tengah — proyeksi rotasi menuju pita atas (±${idn(bb.up[n-1],0)}).`:price<bb.lo[n-1]?'Harga di bawah pita bawah — tekanan ekstrem/oversold.':'Harga di bawah pita tengah — konsolidasi.'}`]);
  const ulI=$('#tkInd'); ulI.innerHTML='';
  for(const [ic,html] of [...ind, ...why.map(w=>[w[0],w[1]])]){
    const li=document.createElement('li'); li.dataset.ic=ic; li.innerHTML=html; ulI.appendChild(li);
  }

  // support/resistance/fib
  const nearFib = fibs.reduce((a,b)=>Math.abs(b.v-price)<Math.abs(a.v-price)?b:a);
  $('#tkSR').innerHTML =
    `<h3 style="margin-top:0">Support (zona pertahanan pembeli)</h3>`
    + (sup.length? sup.map((s,i)=>`<div>S${i+1}: <b>${idn(s.v,0)}</b> <span class="hint">(${s.n}× teruji · ${fmtPct((s.v/price-1)*100)} dari harga)</span></div>`).join('') : `<div class="hint">Harga di dekat titik terendah periode (${idn(loAll,0)}).</div>`)
    + `<h3>Resistance (zona hambatan penjual)</h3>`
    + (res.length? res.map((r,i)=>`<div>R${i+1}: <b>${idn(r.v,0)}</b> <span class="hint">(${r.n}× teruji · ${fmtPct((r.v/price-1)*100)} dari harga)</span></div>`).join('') : `<div class="hint">Harga di dekat titik tertinggi periode (${idn(hiAll,0)}).</div>`)
    + `<h3>Fibonacci Retracement (${idn(loAll,0)} → ${idn(hiAll,0)})</h3>`
    + fibs.map(f=>`<div${f===nearFib?' style="font-weight:700"':''}>${f.p}%: ${idn(f.v,0)}${f===nearFib?' ← terdekat dari harga':''}</div>`).join('');

  // rencana trading otomatis
  const S1 = sup[0]?sup[0].v:loAll, S2 = sup[1]?sup[1].v:S1*0.97;
  const R1 = res[0]?res[0].v:(fibs[0].v>price?fibs[0].v:hiAll);
  const R2 = res[1]?res[1].v:(R1*1.06);
  const entry=(S1+price)/2, sl=Math.min(S2*0.995, S1*0.98);
  const rr1=(R1-entry)/(entry-sl), rr2=(R2-entry)/(entry-sl);
  const line=(l,v)=>`<div class="line"><span>${l}</span><b>${v}</b></div>`;
  $('#tkPlan').innerHTML =
    line('Zona entry (Buy on Weakness)', `${idn(S1,0)} – ${idn(price,0)}`)
    + line('Stop loss (close harian)', `< ${idn(sl,0)} (${fmtPct((sl/entry-1)*100)})`)
    + line('Target 1 (R1)', `${idn(R1,0)} (${fmtPct((R1/entry-1)*100)}) · RR 1 : ${idn(Math.max(rr1,0),1)}`)
    + line('Target 2 (R2 / Fibonacci)', `${idn(R2,0)} (${fmtPct((R2/entry-1)*100)}) · RR 1 : ${idn(Math.max(rr2,0),1)}`)
    + `<div class="verdict" style="color:${rr2>=2?'var(--goodtext)':rr2>=1.5?'var(--serious)':'var(--critical)'};border-color:${rr2>=2?'var(--good)':rr2>=1.5?'var(--serious)':'var(--critical)'}">
       ${rr2>=2?'✅ Risk-reward memenuhi standar institusional (≥ 1:2) pada Target 2.':rr2>=1.5?'⚠️ Risk-reward marginal — tunggu entry lebih dekat ke support.':'⛔ Risk-reward tidak sepadan di level saat ini — tunggu koreksi.'}
       <span class="hint" style="font-weight:400">Level dihitung otomatis dari swing harga — validasi manual tetap disarankan.</span></div>`;

  // grafik
  const cols=[
    {arr:c, color:cssVar('--blue'), label:'Close', w:2},
    ...(ma20.some(v=>v!=null)?[{arr:ma20, color:cssVar('--yellow'), label:'MA20', w:1.5}]:[]),
    ...(ma50.some(v=>v!=null)?[{arr:ma50, color:cssVar('--aqua'), label:'MA50', w:1.5}]:[]),
    ...(ma200.some(v=>v!=null)?[{arr:ma200, color:cssVar('--violet'), label:'MA200', w:1.5}]:[]),
  ];
  const lv=[...(sup[0]?[{v:S1,label:'S1'}]:[]), ...(res[0]?[{v:R1,label:'R1'}]:[])];
  $('#tkLegend').innerHTML = cols.map(s=>`<span class="chip"><span class="dot" style="background:${s.color}"></span>${s.label}</span>`).join('')
    + (lv.length?'<span class="chip"><span class="dot" style="background:var(--muted)"></span>S/R (putus-putus)</span>':'');
  drawTK($('#chTK'), $('#ttTK'), rows, cols, lv, {ma20,ma50,ma200});
  $('#tkOut').style.display='block';
}
$('#btnRunTK').onclick = runTeknikal;

function drawTK(box, tt, rows, cols, lv, mas){
  const f = chartFrame(880,300,64,44,12,26);
  const vals=[];
  for(const s of cols) for(const v of s.arr) if(v!=null) vals.push(v);
  for(const l of lv) vals.push(l.v);
  const ticks=niceTicks(Math.min(...vals), Math.max(...vals));
  const y0=ticks[0], y1=ticks[ticks.length-1];
  const X=i=>f.padL+(rows.length===1?f.iw/2:i/(rows.length-1)*f.iw);
  const Y=v=>f.padT+(1-(v-y0)/(y1-y0))*f.ih;
  let s=svgOpen(f);
  for(const tv of ticks){
    s+=`<line x1="${f.padL}" x2="${f.W-f.padR}" y1="${Y(tv)}" y2="${Y(tv)}" stroke="${cssVar('--grid')}" stroke-width="1"/>`;
    s+=`<text x="${f.padL-8}" y="${Y(tv)+4}" text-anchor="end" font-size="10.5" fill="${cssVar('--muted')}">${tv.toLocaleString('id-ID')}</text>`;
  }
  const step=Math.ceil(rows.length/8);
  rows.forEach((r,i)=>{ if(i%step===0||i===rows.length-1)
    s+=`<text x="${X(i)}" y="${f.H-8}" text-anchor="middle" font-size="10.5" fill="${cssVar('--muted')}">${r.date.slice(2,7)}</text>`; });
  for(const l of lv){
    s+=`<line x1="${f.padL}" x2="${f.W-f.padR}" y1="${Y(l.v)}" y2="${Y(l.v)}" stroke="${cssVar('--baseline')}" stroke-width="1.2" stroke-dasharray="5 4"/>`;
    s+=`<text x="${f.W-f.padR+4}" y="${Y(l.v)+4}" font-size="10.5" fill="${cssVar('--muted')}">${l.label} ${l.v.toLocaleString('id-ID',{maximumFractionDigits:0})}</text>`;
  }
  for(const col of cols){
    let d='',pen=false;
    for(let i=0;i<col.arr.length;i++){const v=col.arr[i];
      if(v==null){pen=false;continue;}
      d+=(pen?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1);pen=true;}
    s+=`<path d="${d}" fill="none" stroke="${col.color}" stroke-width="${col.w}" stroke-linejoin="round"/>`;
  }
  s+='</svg>';
  box.querySelector('svg')?.remove();
  box.insertAdjacentHTML('beforeend', s);
  hookTooltip(box, tt, rows, f, i=>{
    let h=`<b>${rows[i].date}</b><br>Close: ${idn(rows[i].close,0)}`;
    if(mas.ma20[i]!=null)h+=`<br>MA20: ${idn(mas.ma20[i],0)}`;
    if(mas.ma50[i]!=null)h+=`<br>MA50: ${idn(mas.ma50[i],0)}`;
    if(mas.ma200[i]!=null)h+=`<br>MA200: ${idn(mas.ma200[i],0)}`;
    return h;
  });
}

function initTK(){
  const sel=$('#tkTicker'); const cur=sel.value;
  const ticks=Object.keys(history).sort();
  sel.innerHTML = ticks.length? ticks.map(t=>`<option>${t}</option>`).join('') : '<option value="">(kosong)</option>';
  if(ticks.includes(cur)) sel.value=cur;
}
$('#tkSource').onchange = ()=>{
  const src=$('#tkSource').value;
  $('#tkTickerWrap').style.display = src==='hist'?'block':'none';
  $('#tkCSVWrap').style.display = src==='csv'?'block':'none';
  if(src==='hist') initTK();
};

/* ---------- Analisis Fundamental ---------- */
$('#fdTicker').addEventListener('input', ()=>{
  const t = normTicker($('#fdTicker').value);
  if(!/^[A-Z]{4}$/.test(t)){ $('#fdLoadMsg').textContent=''; return; }
  try{
    const d = JSON.parse(localStorage.getItem('bdm_fund_'+t));
    if(d){
      $('#fdEps').value = d.eps??''; $('#fdBvps').value = d.bvps??'';
      $('#fdDps').value = d.dps??''; $('#fdGrowth').value = d.growth??'';
      if(d.fairper) $('#fdFairPer').value = d.fairper;
      $('#fdLoadMsg').innerHTML = `✓ data tersimpan ${d.saved||''} dimuat`;
    } else $('#fdLoadMsg').textContent = stockName(t)? '✓ '+stockName(t) : '';
  }catch(e){}
});

$('#btnFdPrice').onclick = async ()=>{
  const t = normTicker($('#fdTicker').value);
  if(!/^[A-Z]{4}$/.test(t)) return alert('Isi kode saham dulu (mis. BBRI).');
  $('#fdMsg').textContent = '⏳ Mengambil harga…';
  try{
    const {rows} = await fetchYahoo(t, '5d');
    const last = rows[rows.length-1];
    $('#fdPrice').value = last.close;
    $('#fdMsg').innerHTML = `✅ ${t} close ${last.date}: <b>Rp ${idn(last.close,0)}</b>`;
  }catch(e){ $('#fdMsg').textContent = '❌ '+e.message; }
};

$('#btnRunFD').onclick = ()=>{
  const t = normTicker($('#fdTicker').value);
  const price = +$('#fdPrice').value;
  const eps = parseFloat($('#fdEps').value);
  const bvps = parseFloat($('#fdBvps').value);
  const dps = parseFloat($('#fdDps').value)||0;
  const growth = parseFloat($('#fdGrowth').value);
  const fairper = +$('#fdFairPer').value||12;
  if(!/^[A-Z]{4}$/.test(t)) return alert('Isi kode saham dulu.');
  if(!(price>0)) return alert('Isi harga sekarang (atau klik 🔄 Ambil Harga).');
  if(!isFinite(eps) && !(bvps>0)) return alert('Minimal isi EPS atau BVPS.');
  localStorage.setItem('bdm_fund_'+t, JSON.stringify({eps:isFinite(eps)?eps:null, bvps:bvps>0?bvps:null,
    dps, growth:isFinite(growth)?growth:null, fairper, saved:new Date().toISOString().slice(0,10)}));

  const per = eps>0? price/eps : null;
  const pbv = bvps>0? price/bvps : null;
  const roe = (eps>0 && bvps>0)? eps/bvps*100 : null;
  const dy = dps>0? dps/price*100 : 0;
  const ey = per? 100/per : null;
  const peg = (per && growth>0)? per/growth : null;
  const rugi = isFinite(eps) && eps<=0;

  // kartu rasio + statusnya
  const card = (l,v,d,cls='')=>`<div class="card statcard"><div class="lbl">${l}</div><div class="val ${cls}">${v}</div><div class="det">${d}</div></div>`;
  const perSt = per==null? ['—',''] : per<8? ['sangat murah','pos'] : per<12? ['murah','pos'] : per<16? ['wajar',''] : per<20? ['agak mahal','neg'] : ['mahal','neg'];
  const pbvSt = pbv==null? ['—',''] : pbv<1? ['di bawah nilai buku','pos'] : pbv<1.5? ['murah','pos'] : pbv<2.5? ['wajar',''] : pbv<4? ['premium','neg'] : ['sangat premium','neg'];
  const roeSt = roe==null? ['—',''] : roe>20? ['sangat efisien','pos'] : roe>15? ['bagus','pos'] : roe>10? ['cukup',''] : roe>5? ['rendah','neg'] : ['sangat rendah','neg'];
  const dySt = dy>6? ['sangat tinggi','pos'] : dy>4? ['tinggi','pos'] : dy>2? ['sedang',''] : dy>0.5? ['kecil',''] : ['minim/nihil','neg'];
  $('#fdCards').innerHTML =
    card('PER (harga ÷ laba)', rugi? 'RUGI' : per? idn(per,1)+'×' : '—', rugi? 'EPS negatif — valuasi laba tak berlaku' : `${perSt[0]}${ey?` · earnings yield ${idn(ey,1)}% vs deposito ±6%`:''}`, rugi?'neg':perSt[1])
    + card('PBV (harga ÷ nilai buku)', pbv? idn(pbv,2)+'×' : '—', pbvSt[0], pbvSt[1])
    + card('ROE (laba ÷ modal)', roe? idn(roe,1)+'%' : '—', `${roeSt[0]}${peg?` · PEG ${idn(peg,2)}`:''}`, roeSt[1])
    + card('Dividend Yield', idn(dy,2)+'%', `${dySt[0]}${dps?` · Rp ${idn(dps,0)}/lembar`:''}`, dySt[1]);

  // nilai wajar & margin of safety
  const graham = (eps>0 && bvps>0)? Math.sqrt(22.5*eps*bvps) : null;
  const fvPer = eps>0? eps*fairper : null;
  const fvs = [graham, fvPer].filter(v=>v);
  const fair = fvs.length? fvs.reduce((a,b)=>a+b,0)/fvs.length : null;
  const mos = fair? (fair-price)/fair*100 : null;
  const line = (l,v)=>`<div class="line"><span>${l}</span><b>${v}</b></div>`;
  $('#fdFair').innerHTML = rugi || !fair
    ? `<div class="empty">Perusahaan rugi / data kurang — estimasi nilai wajar berbasis laba tidak berlaku.${pbv?` PBV ${idn(pbv,2)}× bisa jadi acuan kasar (${pbvSt[0]}).`:''}</div>`
    : (graham? line('Graham Number √(22,5 × EPS × BVPS)', 'Rp '+idn(graham,0)) : '')
      + (fvPer? line(`Nilai wajar PER ${idn(fairper,1)}× × EPS`, 'Rp '+idn(fvPer,0)) : '')
      + line('Rata-rata nilai wajar', 'Rp '+idn(fair,0))
      + line('Harga sekarang', 'Rp '+idn(price,0))
      + `<div class="verdict" style="color:${mos>=20?'var(--goodtext)':mos>=0?'var(--blue)':mos>=-15?'var(--serious)':'var(--critical)'};border-color:${mos>=20?'var(--good)':mos>=0?'var(--blue)':mos>=-15?'var(--serious)':'var(--critical)'}">
        ${mos>=20?'💎 Margin of safety '+idn(mos,0)+'% — diskon besar terhadap nilai wajar.'
         : mos>=0?'✅ Margin of safety '+idn(mos,0)+'% — di bawah nilai wajar.'
         : mos>=-15?'⚠️ Harga '+idn(-mos,0)+'% di atas nilai wajar — premium.'
         : '⛔ Harga '+idn(-mos,0)+'% di atas nilai wajar — sangat premium.'}</div>`;

  // skor fundamental 0–100
  const parts = [];
  const add = (name, pts, max, note)=> parts.push({name, pts, max, note});
  if(rugi) add('Valuasi laba (PER)', 0, 25, 'EPS negatif');
  else if(per) add('Valuasi laba (PER)', per<8?25:per<12?20:per<16?12:per<20?6:0, 25, idn(per,1)+'×');
  else add('Valuasi laba (PER)', 0, 25, 'tidak ada data');
  if(pbv) add('Valuasi buku (PBV)', pbv<1?20:pbv<1.5?16:pbv<2.5?10:pbv<4?5:0, 20, idn(pbv,2)+'×');
  else add('Valuasi buku (PBV)', 0, 20, 'tidak ada data');
  if(roe) add('Kualitas (ROE)', roe>20?20:roe>15?16:roe>10?10:roe>5?5:0, 20, idn(roe,1)+'%');
  else add('Kualitas (ROE)', 0, 20, 'tidak ada data');
  add('Dividen', dy>6?15:dy>4?12:dy>2?7:dy>0.5?3:0, 15, idn(dy,2)+'%');
  if(isFinite(growth)) add('Pertumbuhan laba', growth>15?10:growth>5?7:growth>0?4:0, 10, fmtPct(growth));
  else add('Pertumbuhan laba', 0, 10, 'tidak diisi');
  if(mos!=null) add('Margin of safety', mos>30?10:mos>10?6:mos>0?3:0, 10, fmtPct(mos));
  else add('Margin of safety', 0, 10, '—');
  const fdPts = parts.reduce((s,p)=>s+p.pts,0);
  const fdVerdict = fdPts>=70? ['SANGAT MENARIK — murah & berkualitas','var(--good)','💎']
    : fdPts>=55? ['MENARIK','var(--blue)','✅']
    : fdPts>=40? ['WAJAR','var(--muted)','⚖️']
    : fdPts>=25? ['KURANG MENARIK','var(--serious)','⚠️']
    : ['LEMAH / MAHAL','var(--critical)','⛔'];
  $('#fdScore').innerHTML =
    `<div class="scorewrap"><div class="big" style="color:${fdVerdict[1]}">${fdPts}</div>
     <div><span class="badge" style="color:${fdVerdict[1]};border-color:${fdVerdict[1]}">${fdVerdict[2]} ${fdVerdict[0]}</span></div></div>
     <div class="meter"><div style="width:${fdPts}%;background:${fdVerdict[1]}"></div></div>
     <ul class="insights" style="margin-top:8px">${parts.map(p=>`<li data-ic="${p.pts>=p.max*0.66?'✅':p.pts>=p.max*0.33?'▪️':'✗'}">${p.name}: <b>${p.pts}/${p.max}</b> <span class="hint">(${p.note})</span></li>`).join('')}</ul>`;

  // rating gabungan dengan bandarmologi
  let bScore = null, bSrc = '';
  if(lastResult && lastResult.ticker===t){ bScore = lastResult.score; bSrc = 'analisis broksum '+lastResult.date; }
  else if(history[t] && history[t].length){ const L = history[t][history[t].length-1]; bScore = L.score; bSrc = 'riwayat '+L.date; }
  let combo;
  if(bScore==null)
    combo = `<div class="empty">Belum ada data bandarmologi untuk ${t} — jalankan tab 📊 Analisis atau 📅 Multi-Hari dulu, lalu analisis ulang di sini untuk rating gabungan.</div>`;
  else{
    const fGood = fdPts>=55, fBad = fdPts<40, bGood = bScore>=62, bBad = bScore<=38;
    let vb;
    if(fGood && bGood) vb = ['💎 STRONG BUY — murah/berkualitas DAN sedang diakumulasi bandar. Kombinasi persis tesis risetmu (value + smart money).','var(--good)'];
    else if(fGood && bBad) vb = ['⏳ MURAH TAPI MASIH DIBUANG — valuasi menarik namun smart money masih keluar. Sabar: tunggu jejak akumulasi muncul sebelum masuk (jangan menangkap pisau).','var(--serious)'];
    else if(fGood) vb = ['✅ VALUE, MENUNGGU KONFIRMASI — fundamental menarik, aliran bandar belum tegas. Pantau broksum beberapa hari.','var(--blue)'];
    else if(fBad && bGood) vb = ['⚠️ MOMENTUM SPEKULATIF — diakumulasi bandar tapi fundamentalnya mahal/lemah. Boleh trading, bukan investasi: disiplin stop-loss, jangan pegang lama.','var(--serious)'];
    else if(fBad && bBad) vb = ['⛔ HINDARI — mahal/lemah dan dibuang bandar.','var(--critical)'];
    else vb = ['⚖️ NETRAL — tidak ada keunggulan tegas dari dua sisi.','var(--muted)'];
    combo = `<div class="row" style="gap:20px;margin-bottom:8px">
      <div class="statcard"><div class="lbl">Fundamental</div><div class="val" style="color:${fdVerdict[1]}">${fdPts}/100</div><div class="det">${fdVerdict[0]}</div></div>
      <div class="statcard"><div class="lbl">Bandar Score</div><div class="val" style="color:${bScore>=62?'var(--good)':bScore<=38?'var(--critical)':'var(--muted)'}">${bScore}/100</div><div class="det">${bSrc}</div></div>
    </div>
    <div class="verdict" style="color:${vb[1]};border-color:${vb[1]}">${vb[0]}</div>
    <div class="hint" style="margin-top:6px">Lengkapi dengan 📐 Teknikal untuk timing entry, dan 🔮 Uji Prediksi untuk mengukur akurasi historis sinyalnya.</div>`;
  }
  $('#fdCombo').innerHTML = combo;
  $('#fdOut').style.display = 'block';
  $('#fdMsg').innerHTML = `✅ Analisis ${t} selesai — angka fundamental tersimpan.`;
};

/* ---------- Demo ---------- */
const DEMO_BUY = `CC\t620000\t172.4B\t2781
OD\t540000\t150.1B\t2779
NI\t380000\t105.7B\t2782
DX\t210000\t58.4B\t2780
YP\t150000\t41.7B\t2783
PD\t140000\t38.9B\t2781
SQ\t130000\t36.2B\t2784
XC\t90000\t25.0B\t2779
XL\t70000\t19.5B\t2785
KK\t60000\t16.7B\t2778
AK\t45000\t12.5B\t2782
ZP\t40000\t11.1B\t2780`;
const DEMO_SELL = `BK\t520000\t144.6B\t2781
ZP\t410000\t114.0B\t2780
RX\t350000\t97.3B\t2779
KZ\t260000\t72.3B\t2781
YP\t210000\t58.4B\t2780
PD\t180000\t50.0B\t2778
MS\t120000\t33.4B\t2782
XC\t120000\t33.4B\t2782
XL\t90000\t25.0B\t2779
KK\t75000\t20.9B\t2780
CC\t60000\t16.7B\t2781
GR\t55000\t15.3B\t2778`;

$('#btnDemo').onclick = ()=>{
  $('#inTicker').value='BBRI'; $('#inDate').value='2026-07-10';
  $('#inPrev').value=2780; $('#inClose').value=2790;
  $('#inVol').value=265400000; $('#inAvgVol').value=248000000;
  $('#inUnit').value='1'; $('#inMMean').value='1000000';
  $('#inBuy').value=DEMO_BUY; $('#inSell').value=DEMO_SELL;
};
$('#btnClear').onclick = ()=>{
  ['inTicker','inPrev','inClose','inVol','inAvgVol','inBuy','inSell'].forEach(id=>$('#'+id).value='');
};

$('#btnDemoHist').onclick = ()=>{
  const demo = [
    ['2026-06-08',2600,2650,310e6,38,'MARK-DOWN',-420e9,120e9,180e9],
    ['2026-06-09',2540,2600,355e6,35,'MARK-DOWN',-510e9,160e9,210e9],
    ['2026-06-10',2580,2540,290e6,52,'NETRAL / TRANSISI',-260e9,290e9,30e9],
    ['2026-06-15',2630,2580,265e6,58,'NETRAL / TRANSISI',-180e9,300e9,-60e9],
    ['2026-06-22',2700,2630,255e6,64,'AKUMULASI',-220e9,380e9,-95e9],
    ['2026-06-26',2760,2700,248e6,68,'AKUMULASI',-150e9,360e9,-130e9],
    ['2026-06-30',2680,2760,270e6,61,'NETRAL / TRANSISI',-310e9,340e9,-10e9],
    ['2026-07-02',2630,2680,262e6,63,'AKUMULASI',-280e9,410e9,-80e9],
    ['2026-07-06',2700,2630,251e6,69,'AKUMULASI',-190e9,400e9,-140e9],
    ['2026-07-08',2760,2700,258e6,71,'AKUMULASI',-240e9,430e9,-120e9],
    ['2026-07-09',2780,2760,246e6,72,'AKUMULASI',-138e9,350e9,-110e9],
    ['2026-07-10',2790,2780,265e6,75,'AKUMULASI',-438e9,506e9,-61e9],
  ];
  history['DEMO-BBRI'] = demo.map(([date,close,prev,vol,score,phase,netF,netI,netR])=>({
    date,close,prev,vol,score,phase,netF,netI,netR,totalVal:690e9}));
  saveHist();
  $$('#tabs button').forEach(x=>x.classList.toggle('active', x.dataset.tab==='hist'));
  $$('.panel').forEach(p=>p.classList.toggle('active', p.id==='panel-hist'));
  renderHistTickers(); $('#histTicker').value='DEMO-BBRI'; renderHistory();
};

/* ---------- Tape / Running Trade (Time & Sales) ---------- */
const TAPE_BOARD = new Set(['RG','TN','NG']);              // penanda papan perdagangan — bukan kode broker
const TAPE_SIDE  = {B:1, BUY:1, S:-1, SELL:-1};            // kolom sisi eksplisit bila ada
let lastTape = null;                                        // hasil analisis tape terakhir (utk CSV & silang order book)
const hhmmss = s => { s=Math.floor(s);
  return String(Math.floor(s/3600)).padStart(2,'0')+':'+String(Math.floor(s%3600/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); };

function tapeParse(text){
  const trades = []; let skipped = 0;
  for(const raw of text.split(/\r?\n/)){
    const line = raw.trim(); if(!line) continue;
    let toks = line.includes('\t') ? line.split(/\t+/) : line.split(/[;|]+|\s+/);
    toks = toks.map(t=>t.trim()).filter(Boolean);
    // token jam wajib — baris tanpa jam (header dll.) dilewati diam-diam
    let tSec = null, tIdx = -1;
    for(let i=0;i<toks.length;i++){
      const m = toks[i].match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if(m){ tSec = (+m[1])*3600 + (+m[2])*60 + (+(m[3]||0)); tIdx = i; break; }
    }
    if(tSec===null) continue;
    let side = 0; const brokers = []; const nums = [];
    for(let i=0;i<toks.length;i++){
      if(i===tIdx) continue;
      const tok = toks[i], up = tok.toUpperCase();
      if(tok.includes('%') || tok.startsWith('(')) continue;          // kolom persen
      if(/^[+\-−]/.test(tok)) continue;                               // kolom change bertanda
      if(TAPE_BOARD.has(up)) continue;                                // papan RG/TN/NG
      if(TAPE_SIDE[up] !== undefined){ side = TAPE_SIDE[up]; continue; }
      if(/^[A-Z]{4}$/.test(up) && IDX_STOCKS[up]) continue;           // kolom kode saham
      if(/^[A-Z]{2}$/.test(up)){ if(brokers.length<2) brokers.push(up); continue; }
      const p = parseNumToken(tok, 1e9);
      if(p && nums.length<4) nums.push(p.val);
    }
    if(nums.length<2){ skipped++; continue; }
    // kolom nilai (harga×lot×100) di ujung? buang agar lot tidak salah ambil
    if(nums.length>=3){
      const last = nums[nums.length-1], guess = nums[0]*nums[nums.length-2]*100;
      if(guess>0 && Math.abs(last-guess) <= 0.02*last) nums.pop();
    }
    const price = nums[0], lot = nums[nums.length-1];
    if(!(price>0) || !(lot>0)){ skipped++; continue; }
    trades.push({t:tSec, price, lot, side, buyer:brokers[0]||null, seller:brokers[1]||null});
  }
  // running trade sering ditampilkan terbaru-di-atas — deteksi lalu balik ke kronologis
  let down=0, up=0;
  for(let i=1;i<trades.length;i++){ if(trades[i].t<trades[i-1].t) down++; else if(trades[i].t>trades[i-1].t) up++; }
  if(down>up) trades.reverse();
  return {trades, skipped};
}

function tapeClusters(trades, winSec, bigTh, median, lam){
  const clusters = []; let cur = null;
  for(const tr of trades){
    if(cur && tr.dir===cur.dir && tr.t-cur.tEnd<=winSec){ cur.trades.push(tr); cur.tEnd=tr.t; }
    else { if(cur) clusters.push(cur); cur = {dir:tr.dir, tStart:tr.t, tEnd:tr.t, trades:[tr]}; }
  }
  if(cur) clusters.push(cur);
  for(const c of clusters){
    c.n = c.trades.length;
    c.lot = c.trades.reduce((s,x)=>s+x.lot,0);
    c.val = c.trades.reduce((s,x)=>s+x.lot*100*x.price,0);
    c.pMin = Math.min(...c.trades.map(x=>x.price));
    c.pMax = Math.max(...c.trades.map(x=>x.price));
    c.vwap = c.val/(c.lot*100);
    const cnt={}; let best=0, uniLot=0;
    for(const x of c.trades){ cnt[x.lot]=(cnt[x.lot]||0)+1; if(cnt[x.lot]>best){ best=cnt[x.lot]; uniLot=x.lot; } }
    c.uniform = best/c.n; c.uniLot = uniLot;
    const maxSingle = Math.max(...c.trades.map(x=>x.lot));
    // uji statistik Poisson: jumlah print cluster harus ≥2σ di atas ekspektasi laju print normal
    // tape ini — rantai print ritel yang kebetulan searah tidak lolos, burst mesin eksekusi lolos jauh
    const expN = lam*Math.max(1, c.tEnd-c.tStart);
    c.sigma = (c.n-expN)/Math.sqrt(Math.max(expN,1));
    c.inst = c.dir!==0 && (maxSingle>=bigTh || (c.n>=3 && c.lot>=bigTh && c.sigma>=2));
    c.type = !c.inst ? null
      : (c.n>=5 && c.uniform>=0.6 && c.uniLot>=median*3) ? 'ICEBERG'
      : (c.n<3) ? 'BLOCK' : 'BURST';
    const bc={};
    for(const x of c.trades){ const k = c.dir>0? x.buyer : x.seller; if(k) bc[k]=(bc[k]||0)+x.lot; }
    let domB=null, domL=0;
    for(const [k,v] of Object.entries(bc)) if(v>domL){ domL=v; domB=k; }
    c.domBroker = domB; c.domShare = c.lot? domL/c.lot : 0;
  }
  return clusters;
}

/* spring (tusuk bawah → pulih dengan pembelian) & upthrust (lempar atas → jatuh dengan penjualan) —
   dipanggil setelah trades[].dir & trades[].inst terisi */
function tapeSpring(trades){
  const n = trades.length;
  if(n<20) return {spring:null, upthrust:null};
  const half = trades.slice(0, Math.floor(n/2)).map(x=>x.price).sort((a,b)=>a-b);
  const ref = half[Math.floor(half.length/2)];             // pivot: median harga paruh awal
  let lowP=Infinity, iLow=-1, hiP=-Infinity, iHi=-1;
  trades.forEach((x,i)=>{ if(x.price<lowP){lowP=x.price;iLow=i;} if(x.price>hiP){hiP=x.price;iHi=i;} });
  let spring=null, upthrust=null;
  const depth=(ref-lowP)/ref*100;
  if(depth>=0.7 && iLow<n-5){
    let rec=-Infinity; for(let i=iLow;i<n;i++) rec=Math.max(rec,trades[i].price);
    if(rec >= ref - 0.25*(ref-lowP)){                      // pulih ≥75% dari kedalaman tusukan
      let d=0, instBuyLot=0;
      for(let i=iLow;i<n;i++){ d+=trades[i].dir*trades[i].lot; if(trades[i].inst&&trades[i].dir>0) instBuyLot+=trades[i].lot; }
      if(d>0) spring={ref, lowP, depth, instBuyLot, tLow:trades[iLow].t};
    }
  }
  const hgt=(hiP-ref)/ref*100;
  if(hgt>=0.7 && iHi<n-5){
    let rec=Infinity; for(let i=iHi;i<n;i++) rec=Math.min(rec,trades[i].price);
    if(rec <= ref + 0.25*(hiP-ref)){                       // jatuh kembali ≥75% dari lonjakan
      let d=0, instSellLot=0;
      for(let i=iHi;i<n;i++){ d+=trades[i].dir*trades[i].lot; if(trades[i].inst&&trades[i].dir<0) instSellLot+=trades[i].lot; }
      if(d<0) upthrust={ref, hiP, hgt, instSellLot, tHi:trades[iHi].t};
    }
  }
  return {spring, upthrust};
}

function tapeAnalyze(trades, winSec, bigOverride){
  // arah aggressor: kolom sisi bila ada, selain itu tick rule (zero-tick ikut arah terakhir)
  let lastDir=0, lastPrice=null;
  const anyExplicit = trades.some(x=>x.side);
  for(const tr of trades){
    let d;
    if(tr.side) d = tr.side;
    else if(lastPrice===null) d = 0;
    else if(tr.price>lastPrice) d = 1;
    else if(tr.price<lastPrice) d = -1;
    else d = lastDir;
    tr.dir = d; if(d) lastDir = d; lastPrice = tr.price;
  }
  const lots = trades.map(x=>x.lot).sort((a,b)=>a-b);
  const q = p => lots[Math.floor(p*(lots.length-1))];
  const median = q(0.5), p95 = q(0.95);
  const bigTh = bigOverride>0 ? bigOverride : Math.max(p95, median*10, 50);
  const t0 = trades[0].t, t1 = trades[trades.length-1].t;
  const lam = trades.length / Math.max(60, t1-t0);         // laju kedatangan print (per detik) — basis uji Poisson
  const clusters = tapeClusters(trades, winSec, bigTh, median, lam);
  const instCl = clusters.filter(c=>c.inst);
  clusters.forEach(c=>c.trades.forEach(x=>x.inst = c.inst));

  let totLot=0, totVal=0, instLot=0, instVal=0, instDeltaLot=0, instDeltaRp=0, retDeltaLot=0, retDeltaRp=0;
  for(const x of trades){
    const v = x.lot*100*x.price; totLot += x.lot; totVal += v;
    if(x.inst){ instLot += x.lot; instVal += v; instDeltaLot += x.dir*x.lot; instDeltaRp += x.dir*v; }
    else { retDeltaLot += x.dir*x.lot; retDeltaRp += x.dir*v; }
  }
  const allDelta = instDeltaLot + retDeltaLot;
  const instPct = totLot? instLot/totLot*100 : 0;
  const instBuy = instCl.filter(c=>c.dir>0), instSell = instCl.filter(c=>c.dir<0);
  const vwapOf = arr => { const l=arr.reduce((s,c)=>s+c.lot,0); return l? arr.reduce((s,c)=>s+c.val,0)/(l*100) : null; };
  const vwapInstBuy = vwapOf(instBuy), vwapInstSell = vwapOf(instSell);

  // dampak harga 5 menit setelah tiap cluster (stealth vs impact) + kampanye broker + sebaran sesi
  for(const c of instCl){
    const tTarget = c.tEnd + 300;
    let lo=0, hi=trades.length-1, ans=trades.length-1;
    while(lo<=hi){ const m=(lo+hi)>>1; if(trades[m].t<=tTarget){ ans=m; lo=m+1; } else hi=m-1; }
    c.impFull = t1 >= tTarget;
    c.imp = (trades[ans].price - c.vwap)/c.vwap*100;
  }
  const impArr = instBuy.filter(c=>c.impFull);
  const avgImpB = impArr.length ? impArr.reduce((s,c)=>s+c.imp,0)/impArr.length : null;
  const stealth = instDeltaLot>0 && instBuy.length>=2 && avgImpB!==null && avgImpB<=0.3;
  const campOf = arr => {
    const m = {};
    for(const c of arr) if(c.domBroker && c.domShare>=0.5) m[c.domBroker]=(m[c.domBroker]||0)+1;
    let best=null; for(const [k,v] of Object.entries(m)) if(v>=2 && (!best||v>best.cnt)) best={code:k,cnt:v};
    return best;
  };
  const campB = campOf(instBuy), campS = campOf(instSell);
  let sess = null;
  if(t1-t0 >= 4500){                                       // butuh rentang ≥75 menit agar sesi bermakna
    const b1=t0+1800, b3=t1-1800, d=[0,0,0];
    for(const x of trades){ if(!x.inst || !x.dir) continue; d[x.t<b1?0 : x.t>b3?2 : 1] += x.dir*x.lot; }
    sess = {d1:d[0], d2:d[1], d3:d[2]};
  }

  // logika urutan kejadian: spring/upthrust + pola pancingan (beli dulu → jual di atas) / reload
  const {spring, upthrust} = tapeSpring(trades);
  let bait=null, reload=null;
  if(instBuy.length && instSell.length && vwapInstBuy && vwapInstSell){
    const avgT = arr => arr.reduce((s,c)=>s+(c.tStart+c.tEnd)/2,0)/arr.length;
    const lotOf = arr => arr.reduce((s,c)=>s+c.lot,0);
    if(avgT(instBuy)<avgT(instSell) && vwapInstSell>vwapInstBuy*1.005 && lotOf(instSell)>=0.5*lotOf(instBuy))
      bait = {buyAvg:vwapInstBuy, sellAvg:vwapInstSell};
    else if(avgT(instSell)<avgT(instBuy) && vwapInstBuy<vwapInstSell*0.995)
      reload = {buyAvg:vwapInstBuy, sellAvg:vwapInstSell};
  }

  // footprint per level + absorpsi (suffix min/max: apakah level pernah ditembus setelahnya)
  const n = trades.length;
  const suffMin = new Array(n), suffMax = new Array(n);
  for(let i=n-1;i>=0;i--){
    suffMin[i] = Math.min(trades[i].price, i+1<n? suffMin[i+1] : Infinity);
    suffMax[i] = Math.max(trades[i].price, i+1<n? suffMax[i+1] : -Infinity);
  }
  const lv = {};
  trades.forEach((x,i)=>{
    const L = lv[x.price] ??= {price:x.price, buy:0, sell:0, lastSellIdx:-1, lastBuyIdx:-1, absorb:false, wall:false};
    if(x.dir>0){ L.buy += x.lot; L.lastBuyIdx = i; }
    else if(x.dir<0){ L.sell += x.lot; L.lastSellIdx = i; }
  });
  const levels = Object.values(lv).sort((a,b)=>b.price-a.price);
  const pHi = levels[0].price, pLo = levels[levels.length-1].price, pRange = Math.max(1, pHi-pLo);
  for(const L of levels){
    // syarat bukti: ≥10 print sesudahnya (level di ujung tape belum teruji), dan hanya dinilai
    // di 25% bawah rentang (absorpsi = support dibela) / 25% atas (tembok = resistance ditahan)
    if(L.sell>=bigTh && L.lastSellIdx>=0 && n-1-L.lastSellIdx>=10 && suffMin[L.lastSellIdx] >= L.price
       && L.price <= pLo + 0.25*pRange) L.absorb = true;
    if(L.buy >=bigTh && L.lastBuyIdx>=0 && n-1-L.lastBuyIdx >=10 && suffMax[L.lastBuyIdx] <= L.price
       && L.price >= pHi - 0.25*pRange) L.wall = true;
  }
  const hasAbsorb = levels.some(L=>L.absorb), hasWall = levels.some(L=>L.wall);

  // agregat per broker (bila kolom buyer/seller ada di ≥50% baris)
  const withBk = trades.filter(x=>x.buyer||x.seller).length;
  let brokerStats = null; const catLot = {ASING:0, INSTITUSI:0, RITEL:0, LAINNYA:0};
  if(withBk >= trades.length*0.5){
    const bs = {};
    for(const x of trades){
      const v = x.lot*100*x.price;
      if(x.buyer){ const b = bs[x.buyer] ??= {code:x.buyer,bLot:0,sLot:0,bVal:0,sVal:0}; b.bLot+=x.lot; b.bVal+=v; catLot[catOf(x.buyer)]+=x.lot; }
      if(x.seller){ const b = bs[x.seller] ??= {code:x.seller,bLot:0,sLot:0,bVal:0,sVal:0}; b.sLot+=x.lot; b.sVal+=v; catLot[catOf(x.seller)]-=x.lot; }
    }
    brokerStats = Object.values(bs).map(b=>({...b, netLot:b.bLot-b.sLot, netVal:b.bVal-b.sVal,
      avgBuy: b.bLot? b.bVal/(b.bLot*100) : null, cat:catOf(b.code)}))
      .sort((a,b)=>b.netVal-a.netVal);
  }

  // skor tape 0–100 — tiap faktor dicatat agar logika penilaian bisa diaudit di UI
  const cl1 = v => Math.max(-1, Math.min(1, v));
  const scoreParts = [];
  let score = 50;
  const addPart = (label, v) => { v = Math.round(v*10)/10; if(v){ score += v; scoreParts.push([label, v]); } };
  if(instLot>0) addPart('Arah net aggressor institusi', 25*cl1(instDeltaLot/instLot));
  if(totLot>0)  addPart('Arah net seluruh tape', 10*cl1(allDelta/totLot));
  const nB = instBuy.length, nS = instSell.length;
  if(nB>=2 && nB>=2*Math.max(nS,1)) addPart('Cluster beli jauh lebih banyak', 5);
  else if(nS>=2 && nS>=2*Math.max(nB,1)) addPart('Cluster jual jauh lebih banyak', -5);
  const iceB = instBuy.some(c=>c.type==='ICEBERG'), iceS = instSell.some(c=>c.type==='ICEBERG');
  if(iceB && !iceS) addPart('Iceberg di sisi beli', 5); else if(iceS && !iceB) addPart('Iceberg di sisi jual', -5);
  if(hasAbsorb && !hasWall) addPart('Absorpsi bid — support dibela', 5);
  else if(hasWall && !hasAbsorb) addPart('Tembok offer — resistance menahan', -5);
  if(campB) addPart('Kampanye beli satu broker', 3);
  if(campS) addPart('Kampanye jual satu broker', -3);
  if(stealth) addPart('Eksekusi senyap (stealth)', 4);
  if(spring) addPart('Spring: tusuk bawah lalu dipulihkan', 6);
  if(upthrust) addPart('Upthrust: lempar atas lalu dijatuhkan', -6);
  if(bait) addPart('Pancingan: angkat dulu, distribusi di atas', -8);
  if(reload) addPart('Reload: jual di atas, beli kembali di bawah', 3);
  score = Math.round(Math.max(0, Math.min(100, score)));

  // temuan kunci
  const ins = [];
  const nType = t => instCl.filter(c=>c.type===t).length;
  if(instCl.length){
    ins.push(['🏦',`Pola institusi menyumbang <b>${idn(instPct,1)}%</b> volume (${instCl.length} cluster: ${nType('BURST')} burst · ${nType('BLOCK')} block · ${nType('ICEBERG')} iceberg) — net aggressor <b class="${instDeltaLot>=0?'pos':'neg'}">${instDeltaLot>=0?'BELI':'JUAL'} ${idn(Math.abs(instDeltaLot),0)} lot</b> (${fmtRp(Math.abs(instDeltaRp))}).`]);
    const big = [...instCl].sort((a,b)=>b.lot-a.lot)[0];
    const bIcon = big.type==='ICEBERG'?'🧊':big.type==='BLOCK'?'🐘':'⚡';
    ins.push([bIcon,`Cluster terbesar: <b>${big.type} ${big.dir>0?'BELI':'JUAL'}</b> pukul ${hhmmss(big.tStart)} — ${big.n} print dalam ${Math.max(1,big.tEnd-big.tStart)} detik, total <b>${idn(big.lot,0)} lot</b> (${fmtRp(big.val)}) @ ${idn(big.vwap,0)}${big.domBroker?` · broker <b>${big.domBroker}</b> mendominasi ${idn(big.domShare*100,0)}%`:''}. ${big.n>=3?'Satu order induk dipecah mesin eksekusi — ritel hampir tidak pernah membuat pola ini.':''}`]);
    if(iceB||iceS){
      const ice = instCl.find(c=>c.type==='ICEBERG');
      ins.push(['🧊',`Iceberg terdeteksi (${ice.dir>0?'sisi beli':'sisi jual'}): lot nyaris seragam ±${idn(ice.uniLot,0)} × ${ice.n} print — auto-refill order tersembunyi; niat eksekusi jauh lebih besar dari yang tampak di order book.`]);
    }
  } else {
    ins.push(['💤',`Tidak ada pola institusi terdeteksi (ambang ${idn(bigTh,0)} lot) — tape didominasi transaksi ritel kecil. Coba periksa hari lain atau turunkan ambang manual.`]);
  }
  if(hasAbsorb){
    const L = levels.filter(x=>x.absorb).sort((a,b)=>b.sell-a.sell)[0];
    ins.push(['🛡️',`<b>Absorpsi bid</b> di level <b>${idn(L.price,0)}</b>: dihantam ${idn(L.sell,0)} lot jual-agresif tapi tidak pernah ditembus ke bawah — ada penampung besar (Wyckoff: effort vs result).`]);
  }
  if(hasWall){
    const L = levels.filter(x=>x.wall).sort((a,b)=>b.buy-a.buy)[0];
    ins.push(['🧱',`<b>Tembok offer</b> di level <b>${idn(L.price,0)}</b>: disapu ${idn(L.buy,0)} lot beli-agresif tapi gagal ditembus ke atas — ada penjual besar menahan harga.`]);
  }
  if(instDeltaLot>0 && retDeltaLot<0)
    ins.push(['🔄',`<b>Transfer klasik:</b> institusi net beli sementara ritel net jual ${idn(Math.abs(retDeltaLot),0)} lot — barang pindah dari weak hands ke strong hands (ciri akumulasi).`]);
  else if(instDeltaLot<0 && retDeltaLot>0)
    ins.push(['⚠️',`<b>Waspada:</b> institusi net jual sementara ritel net beli ${idn(retDeltaLot,0)} lot — ritel berpotensi menjadi exit liquidity (ciri distribusi).`]);
  if(stealth)
    ins.push(['🤫',`<b>Eksekusi senyap:</b> harga rata-rata hanya bergerak ${fmtPct(avgImpB)} dalam 5 menit setelah cluster beli institusi — akumulasi tanpa mengangkat harga; ruang naiknya belum terpakai (pola stealth yang paling dicari).`]);
  else if(avgImpB!==null && avgImpB>=1)
    ins.push(['🚀',`<b>Eksekusi impact tinggi:</b> harga rata-rata ${fmtPct(avgImpB)} dalam 5 menit setelah cluster beli — urgensi tinggi / fase mark-up aktif; kalau ikut tren, disiplinkan trailing stop.`]);
  if(campB)
    ins.push(['🧭',`<b>Kampanye satu pihak:</b> broker <b>${campB.code}</b>${nameOf(campB.code)?' ('+nameOf(campB.code)+')':''} mendominasi ${campB.cnt} dari ${instBuy.length} cluster beli — jejak satu order induk yang dieksekusi bertahap.`]);
  if(campS)
    ins.push(['🧭',`<b>Kampanye jual satu pihak:</b> broker <b>${campS.code}</b>${nameOf(campS.code)?' ('+nameOf(campS.code)+')':''} mendominasi ${campS.cnt} dari ${instSell.length} cluster jual — distribusi terprogram, waspada.`]);
  if(sess && instDeltaLot>0 && sess.d3>0 && sess.d3>=0.4*instDeltaLot)
    ins.push(['🌆',`Institusi paling agresif di <b>sesi akhir</b> (net beli ${idn(sess.d3,0)} lot pada 30 menit terakhir) — keberanian memborong menjelang penutupan sering mendahului mark-up.`]);
  else if(sess && instDeltaLot>0 && sess.d3<0 && Math.abs(sess.d3)>=0.25*instDeltaLot)
    ins.push(['🌗',`Catatan: institusi net beli di sesi awal/tengah tapi <b>net jual di sesi akhir</b> (${idn(sess.d3,0)} lot) — sebagian eksekutor merealisasikan profit intraday.`]);
  if(spring)
    ins.push(['💥',`<b>Spring / shakeout terdeteksi:</b> harga ditusuk ke <b>${idn(spring.lowP,0)}</b> (−${idn(spring.depth,1)}% dari pivot ${idn(spring.ref,0)}) pukul ${hhmmss(spring.tLow)}, lalu dipulihkan${spring.instBuyLot?` dengan ${idn(spring.instBuyLot,0)} lot pembelian institusi`:''} — stop-loss ritel digetok, barangnya dipungut; sinyal klasik pra-mark-up.`]);
  if(upthrust)
    ins.push(['🎣',`<b>Upthrust terdeteksi:</b> harga dilempar ke <b>${idn(upthrust.hiP,0)}</b> (+${idn(upthrust.hgt,1)}% dari pivot) pukul ${hhmmss(upthrust.tHi)} lalu dijatuhkan kembali${upthrust.instSellLot?` sambil institusi melepas ${idn(upthrust.instSellLot,0)} lot`:''} — pancingan beli di puncak, varian distribusi.`]);
  if(bait)
    ins.push(['🪤',`<b>Pola pancingan (pump &amp; distribute):</b> institusi membeli dulu (avg ${idn(bait.buyAvg,0)}) lalu menjual lebih besar di harga atas (avg ${idn(bait.sellAvg,0)}) pada paruh akhir — kenaikan dipakai sebagai panggung melepas barang ke ritel.`]);
  if(reload)
    ins.push(['🔁',`Institusi menjual di atas (avg ${idn(reload.sellAvg,0)}) lalu membeli kembali lebih murah (avg ${idn(reload.buyAvg,0)}) — rotasi/reload posisi; arah bersihnya yang menentukan.`]);
  if(brokerStats){
    const smart = catLot.ASING + catLot.INSTITUSI;
    ins.push(['🗺️',`Kolom broker: Asing <b class="${catLot.ASING>=0?'pos':'neg'}">${(catLot.ASING>=0?'+':'')+idn(catLot.ASING,0)}</b> · Institusi Lokal <b class="${catLot.INSTITUSI>=0?'pos':'neg'}">${(catLot.INSTITUSI>=0?'+':'')+idn(catLot.INSTITUSI,0)}</b> · Ritel <b class="${catLot.RITEL>=0?'pos':'neg'}">${(catLot.RITEL>=0?'+':'')+idn(catLot.RITEL,0)}</b> lot ${smart>0&&catLot.RITEL<0?'— smart money menampung barang ritel.':''}`]);
    const topB = brokerStats[0];
    if(topB && topB.netLot>0 && (topB.cat==='ASING'||topB.cat==='INSTITUSI'))
      ins.push(['🎯',`Broker ${CATS[topB.cat].toLowerCase()} <b>${topB.code}</b>${nameOf(topB.code)?' ('+nameOf(topB.code)+')':''} pembeli bersih terbesar: +${idn(topB.netLot,0)} lot (${fmtRp(topB.netVal)}), avg beli ${idn(topB.avgBuy,0)}.`]);
  }
  if(vwapInstBuy){
    const last = trades[n-1].price, dev = (last/vwapInstBuy-1)*100;
    ins.push(['💰',`Rata-rata beli institusi (VWAP cluster beli) <b>${idn(vwapInstBuy,0)}</b>; harga terakhir ${idn(last,0)} (${fmtPct(dev)} dari modal institusi) — ${Math.abs(dev)<=1.5?'masih menempel modal bandar, area entry menarik selama pola bertahan.':dev>1.5?'sudah di atas modal; kejar harga = beli lebih mahal dari institusi.':'di bawah modal institusi — perhatikan apakah mereka masih bertahan.'}`]);
  }
  const caut = [];
  if(n<50) caut.push(`hanya ${n} print — sampel kecil, kesimpulan lemah`);
  if(!anyExplicit) caut.push('arah beli/jual diestimasi tick-rule (tanpa kolom sisi)');
  const pSpread = levels.length? levels[0].price/levels[levels.length-1].price : 1;
  if(pSpread>2) caut.push('rentang harga terbaca tidak wajar — periksa apakah kolom harga/lot benar');
  if(caut.length) ins.push(['⚠️',`<span class="hint">${caut.join(' · ')}.</span>`]);

  return {trades, clusters, instCl, median, p95, bigTh, winSec, totLot, totVal, instLot, instVal, instPct,
    instDeltaLot, instDeltaRp, retDeltaLot, retDeltaRp, allDelta, vwapInstBuy, vwapInstSell,
    levels, hasAbsorb, hasWall, score, insights:ins, brokerStats, catLot, anyExplicit,
    sess, campB, campS, avgImpB, stealth, spring, upthrust, bait, reload, scoreParts, lam,
    tStart:trades[0].t, tEnd:trades[n-1].t};
}

function tapeTimeAxis(f, t0, t1){
  const span = Math.max(1, t1-t0);
  const X = t => f.padL + (t-t0)/span*f.iw;
  const step = [60,120,300,600,900,1800,3600].find(s=>span/s<=7) || 7200;
  let s = '';
  for(let tv=Math.ceil(t0/step)*step; tv<=t1; tv+=step)
    s += `<text x="${X(tv)}" y="${f.H-8}" text-anchor="middle" font-size="10.5" fill="${cssVar('--muted')}">${hhmmss(tv).slice(0,5)}</text>`;
  return {X, axisSvg:s};
}

function drawTapePrice(box, r){
  const f = chartFrame(880,270,64,14,14,28);
  const T = r.trades;
  const {X, axisSvg} = tapeTimeAxis(f, r.tStart, r.tEnd);
  let pMin=Infinity, pMax=-Infinity;
  for(const x of T){ if(x.price<pMin) pMin=x.price; if(x.price>pMax) pMax=x.price; }
  const ticks = niceTicks(pMin, pMax);
  const y0=ticks[0], y1=ticks[ticks.length-1];
  const Y = v => f.padT + (1-(v-y0)/(y1-y0))*f.ih;
  let s = svgOpen(f);
  for(const tv of ticks){
    s += `<line x1="${f.padL}" x2="${f.W-f.padR}" y1="${Y(tv)}" y2="${Y(tv)}" stroke="${cssVar('--grid')}" stroke-width="1"/>`;
    s += `<text x="${f.padL-8}" y="${Y(tv)+4}" text-anchor="end" font-size="10.5" fill="${cssVar('--muted')}">${tv.toLocaleString('id-ID')}</text>`;
  }
  s += axisSvg;
  const step = Math.ceil(T.length/900);
  const pts = [], vwPts = [];
  let cvv=0, cvl=0;
  for(let i=0;i<T.length;i++){
    cvv += T[i].price*T[i].lot; cvl += T[i].lot;
    if(i%step===0 || i===T.length-1){
      pts.push(`${X(T[i].t).toFixed(1)},${Y(T[i].price).toFixed(1)}`);
      vwPts.push(`${X(T[i].t).toFixed(1)},${Y(cvv/cvl).toFixed(1)}`);
    }
  }
  s += `<polyline points="${pts.join(' ')}" fill="none" stroke="${cssVar('--muted')}" stroke-width="1.3" stroke-linejoin="round"/>`;
  s += `<polyline points="${vwPts.join(' ')}" fill="none" stroke="${cssVar('--blue')}" stroke-width="1.6" opacity="0.9" stroke-linejoin="round"/>`;
  if(r.vwapInstBuy && r.vwapInstBuy>=y0 && r.vwapInstBuy<=y1){
    const yv = Y(r.vwapInstBuy).toFixed(1);
    s += `<line x1="${f.padL}" x2="${f.W-f.padR}" y1="${yv}" y2="${yv}" stroke="${cssVar('--aqua')}" stroke-width="1.3" stroke-dasharray="5 4"/>`;
    s += `<text x="${f.W-f.padR-4}" y="${(Y(r.vwapInstBuy)-5).toFixed(1)}" text-anchor="end" font-size="10" fill="${cssVar('--aqua')}">modal institusi ${idn(r.vwapInstBuy,0)}</text>`;
  }
  const maxLot = Math.max(1, ...r.instCl.map(c=>c.lot));
  for(const c of r.instCl){
    const col = c.dir>0? cssVar('--pos') : cssVar('--neg');
    const rad = 5 + 13*Math.sqrt(c.lot/maxLot);
    const label = `${c.type} ${c.dir>0?'BELI':'JUAL'} · ${hhmmss(c.tStart)}${c.n>1?'–'+hhmmss(c.tEnd):''} · ${c.n} print · ${idn(c.lot,0)} lot · ${fmtRp(c.val)} @ ${idn(c.vwap,0)}${c.domBroker?' · '+c.domBroker:''}`;
    s += `<circle cx="${X((c.tStart+c.tEnd)/2).toFixed(1)}" cy="${Y(c.vwap).toFixed(1)}" r="${rad.toFixed(1)}"
      fill="${col}" fill-opacity="0.45" stroke="${col}" stroke-width="1.5"><title>${label}</title></circle>`;
  }
  box.querySelector('svg')?.remove();
  box.insertAdjacentHTML('beforeend', s+'</svg>');
}

function drawTapeDelta(box, r){
  const f = chartFrame(880,220,64,14,12,28);
  const {X, axisSvg} = tapeTimeAxis(f, r.tStart, r.tEnd);
  let ci=0, cr=0; const S=[];
  for(const x of r.trades){ if(x.inst) ci += x.dir*x.lot; else cr += x.dir*x.lot; S.push({t:x.t, i:ci, r:cr}); }
  let vMin=0, vMax=0;
  for(const p of S){ vMin=Math.min(vMin,p.i,p.r); vMax=Math.max(vMax,p.i,p.r); }
  const ticks = niceTicks(vMin, vMax);
  const y0=ticks[0], y1=ticks[ticks.length-1];
  const Y = v => f.padT + (1-(v-y0)/(y1-y0))*f.ih;
  let s = svgOpen(f);
  for(const tv of ticks){
    s += `<line x1="${f.padL}" x2="${f.W-f.padR}" y1="${Y(tv)}" y2="${Y(tv)}" stroke="${tv===0?cssVar('--baseline'):cssVar('--grid')}" stroke-width="${tv===0?1.5:1}"/>`;
    s += `<text x="${f.padL-8}" y="${Y(tv)+4}" text-anchor="end" font-size="10.5" fill="${cssVar('--muted')}">${idn(tv,0)}</text>`;
  }
  s += axisSvg;
  const step = Math.ceil(S.length/900);
  const line = key => {
    const pts = [];
    for(let i=0;i<S.length;i+=step) pts.push(`${X(S[i].t).toFixed(1)},${Y(S[i][key]).toFixed(1)}`);
    pts.push(`${X(S[S.length-1].t).toFixed(1)},${Y(S[S.length-1][key]).toFixed(1)}`);
    return pts.join(' ');
  };
  s += `<polyline points="${line('r')}" fill="none" stroke="${cssVar('--yellow')}" stroke-width="1.6" stroke-linejoin="round"/>`;
  s += `<polyline points="${line('i')}" fill="none" stroke="${cssVar('--aqua')}" stroke-width="2.2" stroke-linejoin="round"/>`;
  box.querySelector('svg')?.remove();
  box.insertAdjacentHTML('beforeend', s+'</svg>');
}

function renderTape(r){
  $('#tapeBody').style.display = 'block';
  const n = r.trades.length;
  $('#tpNTrades').textContent = idn(n,0);
  $('#tpSpanDet').textContent = `${hhmmss(r.tStart)}–${hhmmss(r.tEnd)} · ${idn(r.totLot,0)} lot (${fmtRp(r.totVal)})${r.skipped?` · ${r.skipped} baris dilewati`:''}`;
  $('#tpInstPct').textContent = idn(r.instPct,1)+'%';
  $('#tpInstDet').textContent = `${r.instCl.length} cluster · ambang ${idn(r.bigTh,0)} lot · median ${idn(r.median,0)} lot`;
  const setD = (idV, idDet, lot, rp) => {
    const el = $(idV); el.textContent = (lot>0?'+':lot<0?'−':'')+idn(Math.abs(lot),0)+' lot';
    el.className = 'val '+(lot>0?'pos':lot<0?'neg':'');
    $(idDet).textContent = (rp>=0?'+':'−')+fmtRp(Math.abs(rp)).replace('Rp ','Rp ');
  };
  setD('#tpInstDelta','#tpInstDeltaDet', r.instDeltaLot, r.instDeltaRp);
  setD('#tpRetDelta','#tpRetDeltaDet', r.retDeltaLot, r.retDeltaRp);

  const [slbl, scol] = scoreLabel(r.score);
  $('#tpScore').textContent = r.score; $('#tpScore').style.color = scol;
  $('#tpScoreLbl').innerHTML = `<b style="color:${scol}">${slbl}</b>`;
  $('#tpMeter').style.width = r.score+'%'; $('#tpMeter').style.background = scol;
  const v = $('#tpVerdict'); v.style.display = 'flex';
  const vd = r.score>=62
    ? ['▲','var(--good)','INSTITUSI TERINDIKASI AKUMULASI','Lot besar & burst dominan di sisi beli. Selaras strategi Buy on Weakness — konfirmasikan dengan Broker Summary (tab Analisis / Multi-Hari).']
    : r.score<=38
    ? ['▼','var(--serious)','INSTITUSI TERINDIKASI DISTRIBUSI','Lot besar & burst dominan di sisi jual — institusi melepas barang ke pasar. Hindari akumulasi baru; awasi support.']
    : ['•','var(--muted)','BELUM ADA DOMINASI JELAS','Aktivitas institusi dua arah atau minim pada tape ini. Tunggu jejak yang lebih tegas / periksa beberapa sesi.'];
  v.style.color = vd[1]; v.style.borderColor = vd[1];
  v.innerHTML = `<span>${vd[0]}</span><span><b>${vd[2]}</b> — <span style="color:var(--ink2);font-weight:400">${vd[3]}</span></span>`;
  const sessEl = $('#tpSess');
  if(r.sess){
    const fs = x => `<b class="${x>0?'pos':x<0?'neg':''}">${(x>0?'+':x<0?'−':'')+idn(Math.abs(x),0)}</b>`;
    sessEl.style.display = 'block';
    sessEl.innerHTML = `Net aggressor institusi per sesi: awal (30 mnt pertama) ${fs(r.sess.d1)} · tengah ${fs(r.sess.d2)} · akhir (30 mnt terakhir) ${fs(r.sess.d3)} lot.`;
  } else sessEl.style.display = 'none';

  $('#tpScoreParts').innerHTML = `<tr><td>Basis netral</td><td class="num">50</td></tr>`
    + r.scoreParts.map(([l,p])=>`<tr><td>${l}</td><td class="num ${p>0?'pos':'neg'}">${p>0?'+':''}${idn(p,1)}</td></tr>`).join('')
    + `<tr><td><b>Total (dibatasi 0–100)</b></td><td class="num"><b>${r.score}</b></td></tr>`;

  const ul = $('#tpInsights'); ul.innerHTML = '';
  for(const [ic, html] of r.insights){
    const li = document.createElement('li'); li.dataset.ic = ic; li.innerHTML = html; ul.appendChild(li);
  }

  renderTapeStory(r);
  drawTapePrice($('#tpChart1'), r);
  drawTapeDelta($('#tpChart2'), r);

  $('#tpClusterRows').innerHTML = [...r.instCl].sort((a,b)=>b.lot-a.lot).slice(0,40).map(c=>{
    const icon = c.type==='ICEBERG'?'🧊':c.type==='BLOCK'?'🐘':'⚡';
    return `<tr><td>${hhmmss(c.tStart)}${c.n>1?'<br><span class="hint">s.d. '+hhmmss(c.tEnd)+'</span>':''}</td>
      <td>${icon} ${c.type}</td>
      <td class="${c.dir>0?'pos':'neg'}">${c.dir>0?'BELI':'JUAL'}</td>
      <td class="num">${c.n}</td><td class="num">${Math.max(1,c.tEnd-c.tStart)} dtk</td>
      <td class="num"><b>${idn(c.lot,0)}</b></td><td class="num">${fmtRp(c.val)}</td>
      <td class="num">${c.pMin===c.pMax? idn(c.pMin,0) : idn(c.pMin,0)+'–'+idn(c.pMax,0)}</td>
      <td class="num ${c.imp>0.05?'pos':c.imp<-0.05?'neg':''}">${c.imp==null?'—':(c.impFull?'':'≈')+fmtPct(c.imp)}</td>
      <td>${c.domBroker? `<b>${c.domBroker}</b> <span class="hint">${idn(c.domShare*100,0)}%</span>` : '—'}</td></tr>`;
  }).join('') || `<tr><td colspan="10" class="empty">Tidak ada cluster institusi pada ambang ${idn(r.bigTh,0)} lot.</td></tr>`;

  $('#tpFootRows').innerHTML = r.levels.slice(0,80).map(L=>{
    const d = L.buy-L.sell;
    return `<tr><td class="num"><b>${idn(L.price,0)}</b></td><td class="num">${idn(L.buy,0)}</td><td class="num">${idn(L.sell,0)}</td>
      <td class="num ${d>0?'pos':d<0?'neg':''}">${(d>0?'+':d<0?'−':'')+idn(Math.abs(d),0)}</td>
      <td>${L.absorb?'🛡️ absorpsi bid ':''}${L.wall?'🧱 tembok offer':''}</td></tr>`;
  }).join('');

  $('#tpBigRows').innerHTML = [...r.trades].sort((a,b)=>b.lot-a.lot).slice(0,15).map(x=>
    `<tr><td>${hhmmss(x.t)}</td><td class="num">${idn(x.price,0)}</td><td class="num"><b>${idn(x.lot,0)}</b></td>
     <td class="num">${fmtRp(x.lot*100*x.price)}</td>
     <td class="${x.dir>0?'pos':x.dir<0?'neg':''}">${x.dir>0?'BELI':x.dir<0?'JUAL':'—'}</td>
     <td>${x.buyer||'—'} → ${x.seller||'—'}</td></tr>`).join('');

  const bc = $('#tpBrokerCard');
  if(r.brokerStats){
    bc.style.display = 'block';
    $('#tpBrokerRows').innerHTML = r.brokerStats.map(b=>
      `<tr><td><b>${b.code}</b> <span class="hint">${nameOf(b.code)}</span></td>
       <td><span class="chip"><span class="dot" style="background:${CATCOLOR[b.cat]}"></span>${CATS[b.cat]}</span></td>
       <td class="num">${idn(b.bLot,0)}</td><td class="num">${idn(b.sLot,0)}</td>
       <td class="num ${b.netLot>0?'pos':b.netLot<0?'neg':''}">${(b.netLot>0?'+':b.netLot<0?'−':'')+idn(Math.abs(b.netLot),0)}</td>
       <td class="num ${b.netVal>0?'pos':b.netVal<0?'neg':''}">${fmtRp(b.netVal)}</td>
       <td class="num">${b.avgBuy? idn(b.avgBuy,0):'—'}</td></tr>`).join('');
    $('#tpBrokerNote').innerHTML = `Kategori broker mengikuti tab 🗺️ Peta Broker — ubah di sana bila perlu. Net lot kategori: Asing <b>${(r.catLot.ASING>=0?'+':'')+idn(r.catLot.ASING,0)}</b> · Institusi Lokal <b>${(r.catLot.INSTITUSI>=0?'+':'')+idn(r.catLot.INSTITUSI,0)}</b> · Ritel <b>${(r.catLot.RITEL>=0?'+':'')+idn(r.catLot.RITEL,0)}</b> · Lainnya <b>${(r.catLot.LAINNYA>=0?'+':'')+idn(r.catLot.LAINNYA,0)}</b>.`;
  } else bc.style.display = 'none';
  if(r.ticker) renderTapeHist(r.ticker); else $('#tpHistCard').style.display = 'none';
}

/* riwayat tape lintas hari per saham (localStorage bdm_tapehist_{T}) */
function tapeHistPush(t, rec){
  try{
    const k = 'bdm_tapehist_'+t;
    const a = JSON.parse(localStorage.getItem(k))||[];
    const i = a.findIndex(x=>x.date===rec.date);
    if(i>=0) a[i]=rec; else a.push(rec);
    a.sort((x,y)=>x.date.localeCompare(y.date));
    localStorage.setItem(k, JSON.stringify(a.slice(-60)));
  }catch(e){}
}
function renderTapeHist(t){
  const card = $('#tpHistCard');
  let a=[]; try{ a = JSON.parse(localStorage.getItem('bdm_tapehist_'+t))||[]; }catch(e){}
  if(!a.length){ card.style.display='none'; return; }
  card.style.display='block';
  $('#tpHistT').textContent = t + (stockName(t)? ' · '+stockName(t) : '');
  $('#tpHistRows').innerHTML = [...a].reverse().slice(0,15).map(x=>
    `<tr><td>${x.date}</td><td class="num">${idn(x.n,0)}</td><td class="num">${idn(x.instPct,1)}%</td>
     <td class="num ${x.instDeltaLot>0?'pos':x.instDeltaLot<0?'neg':''}">${(x.instDeltaLot>0?'+':x.instDeltaLot<0?'−':'')+idn(Math.abs(x.instDeltaLot),0)}</td>
     <td class="num"><b>${x.score}</b></td></tr>`).join('');
  const last5 = a.slice(-5), sum5 = last5.reduce((s,x)=>s+x.instDeltaLot,0), pos5 = last5.filter(x=>x.instDeltaLot>0).length;
  $('#tpHistNote').innerHTML = a.length>=2
    ? `${last5.length} sesi terakhir yang direkam: institusi net <b class="${sum5>=0?'pos':'neg'}">${sum5>=0?'BELI':'JUAL'} ${idn(Math.abs(sum5),0)} lot</b> (${pos5}/${last5.length} sesi net beli). Konsistensi arah lintas hari jauh lebih bermakna daripada satu sesi tunggal.`
    : 'Rekam beberapa sesi (hari berbeda) untuk melihat konsistensi arah institusi lintas hari.';
}

/* klasifikasi pola bandar: menghubungkan semua sinyal menjadi satu "playbook" bernama */
function tapePattern(r){
  const buys = r.instCl.filter(c=>c.dir>0), sells = r.instCl.filter(c=>c.dir<0);
  const iceB = buys.some(c=>c.type==='ICEBERG'), iceS = sells.some(c=>c.type==='ICEBERG');
  const buyish = r.instDeltaLot>0;
  const supB = [r.stealth, !!r.campB, r.hasAbsorb, iceB, !!r.spring, !!(r.sess&&r.sess.d3>0&&buyish), !!r.reload].filter(Boolean).length;
  const supS = [!!r.campS, r.hasWall, iceS, !!r.upthrust, !!r.bait, !!(r.sess&&r.sess.d3<0&&!buyish)].filter(Boolean).length;
  const conf = k => k>=3? 'tinggi' : k===2? 'sedang' : 'rendah';
  const absLv = r.levels.filter(L=>L.absorb).map(L=>L.price);
  const supLvl = absLv.length? Math.min(...absLv) : null;
  if(r.bait) return {icon:'🪤', name:'PANCINGAN — PUMP & DISTRIBUTE', color:'var(--critical)', conf:conf(supS),
    desc:'Institusi mengangkat harga lebih dulu, lalu melepas barang lebih besar di harga atas. Kenaikan intraday dipakai sebagai panggung distribusi — pembeli yang mengejar menjadi exit liquidity.',
    next:'Lazimnya disusul pelemahan begitu dorongan beli ritel habis (1–3 sesi).',
    invalid:`Logika batal bila muncul lagi gelombang beli institusi di atas ${idn(r.vwapInstSell||0,0)} dan harga bertahan di atasnya.`};
  if(r.upthrust && !buyish) return {icon:'🎣', name:'UPTHRUST → DISTRIBUSI', color:'var(--critical)', conf:conf(supS),
    desc:'Harga dilempar ke atas untuk memancing beli ritel, lalu dijatuhkan sambil institusi melepas — shakeout versi distribusi.',
    next:'Waspada kelanjutan turun; puncak upthrust menjadi resistance kuat.',
    invalid:`Batal bila harga mampu ditutup kembali di atas ${idn(r.upthrust.hiP,0)} dengan dukungan beli institusi.`};
  if(r.spring && buyish) return {icon:'💥', name:'SHAKEOUT → AKUMULASI', color:'var(--good)', conf:conf(supB),
    desc:'Harga ditusuk ke bawah untuk menggetok stop-loss dan memancing jual ritel, lalu barangnya dipungut institusi dan harga dipulihkan — pengambilan barang paling agresif sebelum mark-up (Wyckoff spring).',
    next:'Bila sesi berikutnya tidak membuat lower-low, probabilitas mark-up tinggi; titik spring menjadi support kuat.',
    invalid:`Batal bila harga kembali ditutup di bawah titik spring ${idn(r.spring.lowP,0)}.`};
  if(r.stealth && buyish) return {icon:'🤫', name:'AKUMULASI SENYAP (STEALTH)', color:'var(--good)', conf:conf(supB),
    desc:'Institusi mengisi barang lewat burst/iceberg tanpa mengangkat harga — harga sengaja dijaga murah selama pengisian; ruang naiknya belum terpakai. Ini pola akumulasi paling bernilai.',
    next:'Pantau beberapa sesi: akumulasi senyap yang konsisten lintas hari lazim diakhiri mark-up mendadak.',
    invalid:`Batal bila institusi berbalik net jual atau harga tembus di bawah ${supLvl? idn(supLvl,0) : 'level absorpsi'}.`};
  if(buyish && r.avgImpB!==null && r.avgImpB>=1) return {icon:'🚀', name:'MARK-UP AKTIF', color:'var(--blue)', conf:conf(supB),
    desc:'Institusi membeli agresif dan membiarkan harga naik — fase menaikkan harga sedang berjalan, bukan lagi akumulasi diam-diam.',
    next:'Tren dapat berlanjut selama burst beli terus muncul; risiko koreksi tajam saat burst berhenti.',
    invalid:`Batal bila muncul cluster jual besar di puncak atau harga jatuh di bawah modal institusi ${r.vwapInstBuy? idn(r.vwapInstBuy,0):''}.`};
  if(!r.instCl.length) return {icon:'💤', name:'TAPE RITEL MURNI', color:'var(--muted)', conf:'—',
    desc:'Tidak ada jejak institusi pada ambang saat ini — pergerakan hari ini digerakkan ritel; sinyal bandarmologi tidak tersedia.',
    next:'Harga cenderung mengikuti sentimen pasar umum; tunggu jejak institusi muncul.', invalid:'—'};
  if(r.score>=62) return {icon:'▲', name:'AKUMULASI', color:'var(--good)', conf:conf(supB),
    desc:'Bobot bukti condong ke pengumpulan barang oleh institusi, tanpa pola khusus yang menonjol.',
    next:'Cari konfirmasi 2–3 sesi searah sebelum menambah posisi besar.',
    invalid:'Batal bila institusi berbalik net jual di sesi berikutnya.'};
  if(r.score<=38) return {icon:'▼', name:'DISTRIBUSI', color:'var(--serious)', conf:conf(supS),
    desc:'Bobot bukti condong ke pelepasan barang oleh institusi.',
    next:'Hindari akumulasi baru; perhatikan apakah support besar mulai gagal.',
    invalid:'Batal bila muncul absorpsi dan burst beli institusi beberapa sesi beruntun.'};
  return {icon:'•', name:'CAMPURAN / NETRAL', color:'var(--muted)', conf:'rendah',
    desc:'Bukti dua arah atau lemah — institusi belum menunjukkan niat yang jelas pada tape ini.',
    next:'Tunggu sesi berikutnya; jangan memaksakan kesimpulan dari data yang ambigu.', invalid:'—'};
}

/* narasi kronologis: tape dibaca sebagai cerita 3 babak + kesimpulan playbook */
function renderTapeStory(r){
  const pat = tapePattern(r);
  $('#tpPattern').innerHTML =
    `<span class="badge" style="color:${pat.color};border-color:${pat.color}">${pat.icon} ${pat.name}</span>
     <span class="hint" style="margin-left:8px">keyakinan: <b>${pat.conf}</b></span>
     <p style="font-size:13.5px;color:var(--ink2);margin:10px 0 0">${pat.desc}</p>`;
  const T=r.trades, t0=r.tStart, t1=r.tEnd, seg=Math.max(1,(t1-t0)/3);
  const icons=['🕘','🕛','🕒'];
  const rows=[];
  for(let k=0;k<3;k++){
    const a=t0+k*seg, b=k===2? t1 : t0+(k+1)*seg;
    const tr=T.filter(x=>x.t>=a && x.t<=b);
    if(!tr.length) continue;
    const p0=tr[0].price, p1=tr[tr.length-1].price, chg=(p1/p0-1)*100;
    let iD=0, rD=0; for(const x of tr){ if(x.inst) iD+=x.dir*x.lot; else rD+=x.dir*x.lot; }
    const cls=r.instCl.filter(c=>c.tStart>=a && c.tStart<=b);
    const nb=cls.filter(c=>c.dir>0).length, ns=cls.filter(c=>c.dir<0).length;
    const ev=[];
    if(nb) ev.push(`${nb} cluster beli`);
    if(ns) ev.push(`${ns} cluster jual`);
    if(r.spring && r.spring.tLow>=a && r.spring.tLow<=b) ev.push('💥 spring');
    if(r.upthrust && r.upthrust.tHi>=a && r.upthrust.tHi<=b) ev.push('🎣 upthrust');
    const iTxt = iD>0? `institusi <b class="pos">net beli ${idn(iD,0)} lot</b>` : iD<0? `institusi <b class="neg">net jual ${idn(-iD,0)} lot</b>` : 'institusi pasif';
    const rTxt = rD>0? `ritel net beli ${idn(rD,0)}` : rD<0? `ritel net jual ${idn(-rD,0)}` : 'ritel seimbang';
    rows.push(`<li data-ic="${icons[k]}"><b>${hhmmss(a).slice(0,5)}–${hhmmss(b).slice(0,5)}</b> · harga ${idn(p0,0)}→${idn(p1,0)} (${fmtPct(chg)}) — ${iTxt}, ${rTxt}${ev.length? ' · '+ev.join(' · '):''}.</li>`);
  }
  $('#tpStory').innerHTML = rows.join('');
  const nx=$('#tpNext');
  nx.style.display='flex'; nx.style.color='var(--ink)'; nx.style.borderColor=pat.color;
  nx.innerHTML = `<span>➡️</span><span style="font-weight:400"><b>Skenario lanjutan:</b> ${pat.next}${pat.invalid && pat.invalid!=='—'? `<br><b>🚫 Logika batal:</b> ${pat.invalid}`:''}</span>`;
}

$('#btnRunTape').onclick = ()=>{
  const ticker = normTicker($('#tpTicker').value);
  const date = $('#tpDate').value || new Date().toISOString().slice(0,10);
  const win = Math.max(2, Math.min(60, +$('#tpWin').value || 10));
  const bigOv = parseFloat($('#tpBig').value) || 0;
  const {trades, skipped} = tapeParse($('#tpData').value);
  if(trades.length<10) return alert('Minimal 10 baris transaksi valid (kolom Jam, Harga, Lot). Terbaca: '+trades.length+(skipped?` (dilewati ${skipped})`:''));
  const r = tapeAnalyze(trades, win, bigOv);
  r.skipped = skipped;
  r.ticker = /^[A-Z]{4}$/.test(ticker)? ticker : null;
  r.date = date;
  if(r.ticker){
    const sum = {date, n:trades.length, instPct:r.instPct, instDeltaLot:r.instDeltaLot,
      instDeltaRp:r.instDeltaRp, score:r.score, saved:new Date().toISOString().slice(0,10)};
    localStorage.setItem('bdm_tape_'+ticker+'_'+date, JSON.stringify(sum));
    tapeHistPush(ticker, sum);
    $('#tpMsg').innerHTML = `✅ Ringkasan tersimpan — tab 📊 Analisis untuk <b>${ticker} ${date}</b> akan menampilkan konfirmasi tape ini.`;
  } else $('#tpMsg').textContent = '✅ Dianalisis. Isi kode saham + tanggal agar ringkasan tersimpan (riwayat lintas hari & konfirmasi di tab Analisis).';
  lastTape = r;
  renderTape(r);
};

$('#btnTpCsv').onclick = ()=>{
  if(!lastTape) return alert('Jalankan analisis tape dulu.');
  const r = lastTape;
  const rows = [['jam_mulai','jam_selesai','tipe','arah','print','durasi_dtk','total_lot','nilai_rp','vwap','harga_min','harga_max','impact_5m_pct','sigma_poisson','broker_dominan','pangsa_broker_pct']];
  for(const c of [...r.instCl].sort((a,b)=>a.tStart-b.tStart))
    rows.push([hhmmss(c.tStart), hhmmss(c.tEnd), c.type, c.dir>0?'BELI':'JUAL', c.n, Math.max(1,c.tEnd-c.tStart),
      c.lot, Math.round(c.val), Math.round(c.vwap), c.pMin, c.pMax, (c.imp??0).toFixed(2), (c.sigma??0).toFixed(1), c.domBroker||'', Math.round(c.domShare*100)]);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿'+rows.map(x=>x.join(';')).join('\r\n')], {type:'text/csv;charset=utf-8'}));
  a.download = `tape_cluster_${r.ticker||'saham'}_${r.date||''}.csv`;
  a.click();
};

/* ---------- Order Book Snapshot ---------- */
function obParse(text){
  const bids=[], offers=[]; let side=null;
  for(const raw of text.split(/\r?\n/)){
    const line = raw.trim(); if(!line) continue;
    const up = line.toUpperCase();
    if(/^BID/.test(up)){ side='B'; continue; }
    if(/^(OFFER|ASK)/.test(up)){ side='O'; continue; }
    let toks = line.includes('\t') ? line.split(/\t+/) : line.split(/[;|]+|\s+/);
    const nums = [];
    for(const tk of toks){ const p = parseNumToken(tk.trim(), 1e9); if(p) nums.push(p.val); }
    if(nums.length>=4 && nums.length%2===0){
      // baris gabungan simetris: … [lotBid] BID | OFFER [lotOffer] … (kolom frekuensi di luar ikut terbuang)
      const pi = nums.length/2-1;
      const bidP=nums[pi], offP=nums[pi+1], bidL=nums[pi-1], offL=nums[pi+2];
      if(bidP>0 && offP>bidP && (offP-bidP)/bidP<0.25){
        if(bidL>0) bids.push({price:bidP, lot:bidL});
        if(offL>0) offers.push({price:offP, lot:offL});
        continue;
      }
    }
    if(nums.length>=2 && side){
      const price=nums[0], lot=nums[1];
      if(price>0 && lot>0) (side==='B'?bids:offers).push({price, lot});
    }
  }
  bids.sort((a,b)=>b.price-a.price);
  offers.sort((a,b)=>a.price-b.price);
  return {bids, offers};
}

function drawDepth(box, bids, offers){
  const nb=Math.min(bids.length,10), no=Math.min(offers.length,10);
  const rows = [...offers.slice(0,no)].reverse().map(x=>({...x, side:'O'}))
    .concat(bids.slice(0,nb).map(x=>({...x, side:'B'})));
  const rowH=20, f=chartFrame(880, rows.length*rowH+16, 90, 20, 8, 8);
  const maxLot = Math.max(...rows.map(x=>x.lot));
  let s = svgOpen(f);
  rows.forEach((x,i)=>{
    const y=f.padT+i*rowH, w=Math.max(2, x.lot/maxLot*(f.iw-120));
    const col = x.side==='B'? cssVar('--pos') : cssVar('--neg');
    s += `<rect x="${f.padL}" y="${y+3}" width="${w.toFixed(1)}" height="${rowH-6}" rx="3" fill="${col}" fill-opacity="${x.wall?0.95:0.4}"/>`;
    s += `<text x="${f.padL-8}" y="${y+rowH/2+4}" text-anchor="end" font-size="11" fill="${cssVar('--ink2')}">${idn(x.price,0)}</text>`;
    s += `<text x="${(f.padL+w+6).toFixed(1)}" y="${y+rowH/2+4}" font-size="10.5" fill="${cssVar('--muted')}">${idn(x.lot,0)}${x.wall?' 🧱':''}</text>`;
  });
  const ySep = f.padT+no*rowH;
  s += `<line x1="${f.padL-80}" x2="${f.W-10}" y1="${ySep}" y2="${ySep}" stroke="${cssVar('--baseline')}" stroke-dasharray="4 3"/>`;
  box.querySelector('svg')?.remove();
  box.insertAdjacentHTML('beforeend', s+'</svg>');
}

$('#btnRunOB').onclick = ()=>{
  const {bids, offers} = obParse($('#obData').value);
  if(!bids.length || !offers.length)
    return alert('Order book belum terbaca.\nFormat per baris: LOT  BID  OFFER  LOT (salinan antrean),\natau blok diawali baris "BID" / "OFFER" berisi HARGA  LOT.');
  const sum = a => a.reduce((s,x)=>s+x.lot,0);
  const bT=sum(bids), oT=sum(offers), ratio=bT/(bT+oT)*100;
  const med = a => { const s=a.map(x=>x.lot).sort((x,y)=>x-y); return s[Math.floor(s.length/2)]||1; };
  const bM=med(bids), oM=med(offers);
  bids.forEach(x=>x.wall = x.lot>=4*bM);
  offers.forEach(x=>x.wall = x.lot>=4*oM);
  const bestB=bids[0].price, bestO=offers[0].price;
  $('#obOut').style.display='block';
  $('#obBid').textContent = idn(bT,0)+' lot'; $('#obBid').className='val pos';
  $('#obBidDet').textContent = `${bids.length} level · best bid ${idn(bestB,0)}`;
  $('#obOff').textContent = idn(oT,0)+' lot'; $('#obOff').className='val neg';
  $('#obOffDet').textContent = `${offers.length} level · best offer ${idn(bestO,0)}`;
  const pr=$('#obRatio');
  pr.textContent = idn(ratio,0)+' : '+idn(100-ratio,0);
  pr.className = 'val '+(ratio>=58?'pos':ratio<=42?'neg':'');
  $('#obRatioDet').textContent = ratio>=58? 'antrean bid dominan — tekanan beli' : ratio<=42? 'antrean offer dominan — tekanan jual' : 'antrean relatif berimbang';
  const ins=[];
  ins.push([ratio>=58?'📗':ratio<=42?'📕':'⚖️',
    `Rasio antrean <b>${idn(ratio,0)} : ${idn(100-ratio,0)}</b> (${idn(bT,0)} vs ${idn(oT,0)} lot). ${ratio>=58?'Minat beli mengantre lebih tebal — bid kuat menahan penurunan.':ratio<=42?'Penjual menumpuk di offer — perlu pembeli agresif besar untuk menembus.':'Belum ada ketimpangan berarti di antrean.'}`]);
  const bW=bids.filter(x=>x.wall), oW=offers.filter(x=>x.wall);
  for(const w of bW.slice(0,3))
    ins.push(['🛡️',`Tembok bid <b>${idn(w.lot,0)} lot</b> di <b>${idn(w.price,0)}</b> (${fmtPct((w.price/bestB-1)*100)} dari best bid) — support psikologis; bisa pertahanan asli, bisa umpan (bait). Cek tape: kalau ada absorpsi di level itu, pertahanannya asli.`]);
  for(const w of oW.slice(0,3))
    ins.push(['🧱',`Tembok offer <b>${idn(w.lot,0)} lot</b> di <b>${idn(w.price,0)}</b> — resistance terdekat; kalau tembok ini dimakan burst beli besar di tape, itu sinyal kekuatan (breakout absorpsi).`]);
  if(lastTape){
    const hitB = bW.find(w=>lastTape.levels.some(L=>L.absorb && L.price===w.price));
    if(hitB) ins.push(['✅',`<b>Konfirmasi silang dengan tape:</b> tembok bid ${idn(hitB.price,0)} bertepatan dengan level absorpsi di running trade — pertahanan tampaknya asli, bukan pancingan.`]);
    const hitO = oW.find(w=>lastTape.levels.some(L=>L.wall && L.price===w.price));
    if(hitO) ins.push(['✅',`<b>Konfirmasi silang dengan tape:</b> tembok offer ${idn(hitO.price,0)} juga terbukti menahan harga di running trade.`]);
  }
  ins.push(['⚠️',`<span class="hint">Order book adalah niat, bukan transaksi — antrean besar bisa dipasang-cabut (spoofing). Selalu konfirmasi dengan tape/running trade di atas.</span>`]);
  $('#obInsights').innerHTML = ins.map(([ic,h])=>`<li data-ic="${ic}">${h}</li>`).join('');
  drawDepth($('#obChart'), bids, offers);
  $('#obMsg').textContent='';
};

$('#btnObDemo').onclick = ()=>{
  const fmtN = v => v.toLocaleString('id-ID');
  const bl=[850,1200,640,720,5200,910,480,1500,660,540];
  const ol=[420,760,530,610,4100,380,290,850,470,510];
  const L=[];
  for(let i=0;i<10;i++) L.push(`${fmtN(bl[i])}\t${fmtN(2730-i*10)}\t${fmtN(2740+i*10)}\t${fmtN(ol[i])}`);
  $('#obData').value = L.join('\n');
  $('#obMsg').textContent = '✨ Contoh dimuat (tembok bid 5.200 lot @2.690, tembok offer 4.100 lot @2.780) — klik 📖 Analisis Order Book.';
};

$('#btnTapeDemo').onclick = ()=>{
  const rng = mulberry32(20260718);
  const tick = 10, prevC = 2720; let p = 2730;
  const retail = ['YP','PD','XC','XL','KK','CP','GR','EP'];
  const pick = a => a[Math.floor(rng()*a.length)];
  const lines = [];
  const push = (t,price,lot,by,sl)=>{
    const chg = price-prevC;
    lines.push(`${hhmmss(t)}\t${price.toLocaleString('id-ID')}\t${(chg>=0?'+':'')+chg}\t${((price/prevC-1)*100).toFixed(2).replace('.',',')}%\t${Math.round(lot).toLocaleString('id-ID')}\t${by}\t${sl}`);
  };
  // 3 burst beli institusi (CC, KZ iceberg, DX) + 1 block jual — di antara arus ritel acak
  const evs = [
    {t:9*3600+1230,  n:12, lot:()=>350+Math.floor(rng()*300), dir: 1, bk:'CC'},
    {t:10*3600+310,  n:14, lot:()=>500,                        dir: 1, bk:'KZ'},
    {t:10*3600+1815, n:1,  lot:()=>2200,                       dir:-1, bk:'PD'},
    {t:11*3600+615,  n:9,  lot:()=>280+Math.floor(rng()*250),  dir: 1, bk:'CC'},   // CC muncul lagi → kampanye
  ];
  let t = 9*3600+2, ei = 0;
  while(t < 11.5*3600){
    if(ei<evs.length && t>=evs[ei].t){
      const e = evs[ei++]; let et = e.t;
      p = Math.max(2660, Math.min(2830, p + e.dir*tick));   // burst menyapu offer / block menghantam bid
      for(let k=0;k<e.n;k++){
        if(e.dir>0 && e.n>3 && k===Math.floor(e.n*0.7)) p = Math.min(2830, p+tick);
        push(et, p, e.lot(), e.dir>0? e.bk : pick(retail), e.dir>0? pick(retail) : e.bk);
        et += 0.4 + rng()*0.9;
      }
      t = Math.max(t, et)+3;
      continue;
    }
    if(rng()<0.35){ const bias = p>2730? 0.56 : 0.44;      // walk ritel mean-reverting ke 2730
      p = Math.min(2830, Math.max(2660, p + (rng()<bias?-1:1)*tick)); }
    push(t, p, 1+Math.floor(-Math.log(1-rng())*11), pick(retail), pick(retail));
    t += 3 + Math.floor(rng()*18);
  }
  $('#tpData').value = lines.join('\n');
  $('#tpTicker').value = 'BBRI';
  $('#tpDate').value = new Date().toISOString().slice(0,10);
  $('#tpMsg').textContent = '✨ Contoh sintetis dimuat (3 burst beli: CC ×2 → kampanye, KZ iceberg + 1 block jual) — klik ⏱️ Analisis Tape.';
};

/* umpan balik nama emiten saat mengetik kode */
$('#inTicker').addEventListener('input', ()=>{
  const v = normTicker($('#inTicker').value);
  const el = $('#tickerName');
  if(!v){ el.textContent=''; return; }
  const n = stockName(v);
  if(n){ el.innerHTML = `✓ <b>${n}</b>`; el.style.color='var(--goodtext)'; }
  else if(v.length>=4){ el.textContent = '⚠ Tidak ada di daftar emiten — IPO baru / kode khusus tetap bisa dianalisis.'; el.style.color='var(--serious)'; }
  else { el.textContent=''; el.style.color=''; }
});

/* init tanggal hari ini */
$('#inDate').value = new Date().toISOString().slice(0,10);
$('#tpDate').value = new Date().toISOString().slice(0,10);
initTickerList();
renderHistory();
