/* Python-backed analysis is isolated from the original dashboard globals. */
(() => {
  'use strict';
  const host = document.getElementById('panel-python');
  if (!host) return;
  const state = {files: [], result: null, stale: false, busy: false, samples: null, contextTicker: '', contexts: new Map(), tapeResult: null, tapeStale: false};
  const contextIds = ['py-prices','py-fund-date','py-roe','py-growth','py-debt','py-pe','py-tape','py-tape-unit','py-tape-date'];
  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = (value, digits = 0) => value == null || !Number.isFinite(Number(value)) ? '—' : Number(value).toLocaleString('id-ID', {maximumFractionDigits: digits});
  const pct = (value, digits = 1) => value == null ? '—' : `${num(value, digits)}%`;
  const money = value => value == null ? '—' : `Rp ${num(value, 0)}`;
  const compact = value => {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    const v = Number(value), a = Math.abs(v);
    for (const [scale, label] of [[1e12,' T'],[1e9,' M'],[1e6,' jt'],[1e3,' rb']]) if (a >= scale) return `${num(v/scale, 2)}${label}`;
    return num(v, 0);
  };
  const signedClass = value => Number(value) > 0 ? 'pos' : Number(value) < 0 ? 'neg' : '';
  const fractionWidth = value => Math.max(0, Math.min(100, Number(value) || 0));
  const componentLabels = {flow:'Arus broker',concentration:'Konsentrasi',consistency:'Konsistensi',price:'Harga',volume:'Volume',fundamentals:'Fundamental'};

  host.innerHTML = `
    <div class="py-hero">
      <div><div class="py-eyebrow">IDX Broker Flow · Analisis berbasis data</div>
        <h2>Siapa yang konsisten mengakumulasi?</h2>
        <p>Gabungkan broker summary lintas hari. Periksa net buying, harga beli tertimbang, konsentrasi, dan bukti pendukung dalam satu analisis Python.</p>
      </div><span class="py-engine" id="py-engine">Python lokal · belum terhubung</span>
    </div>
    <div class="py-layout">
      <div class="card">
        <h2>1. Broker summary</h2>
        <label class="py-upload"><strong>Unggah satu atau beberapa file</strong>
          <input id="py-files" type="file" accept=".csv,.tsv,.txt" multiple aria-describedby="py-upload-help">
          <div class="hint" id="py-upload-help">Ekspor IPOT atau CSV standar · seluruh hari untuk saham yang sama akan digabungkan.</div>
        </label>
        <div class="py-inline">
          <span class="hint">File contoh lokal:</span>
          <button class="btn small" id="py-sample-raja" type="button">Muat RAJA</button>
          <button class="btn small" id="py-sample-bbri" type="button">Muat BBRI</button>
          <button class="btn small" id="py-clear" type="button" disabled>Hapus file</button>
        </div>
        <details id="py-file-details"><summary id="py-file-count">Belum ada file dipilih</summary><ul class="py-file-list" id="py-file-list"></ul></details>
        <div class="py-inline">
          <label class="py-label">Saham yang dianalisis
            <input id="py-ticker" type="text" maxlength="16" placeholder="Otomatis jika satu saham" list="py-tickers" autocomplete="off" spellcheck="false" style="text-transform:uppercase">
            <datalist id="py-tickers"></datalist>
          </label>
          <label class="py-label">Format angka sumber
            <select id="py-number-format"><option value="auto">Otomatis · periksa pemisah</option><option value="en">Inggris · 1,234.56</option><option value="id">Indonesia · 1.234,56</option></select>
          </label>
        </div>
        <p class="hint">Pilih kode saham bila file berisi beberapa emiten. Rentang tanggal yang tumpang tindih harus dipisahkan agar transaksi tidak dihitung dua kali.</p>
        <details><summary>Format CSV standar</summary><p class="hint"><code>date,ticker,code,buy_value,sell_value,buy_lot,sell_lot,board</code><br>Nilai dalam rupiah penuh; lot boleh kosong bila tidak diketahui. Gunakan satu baris per broker, tanggal, dan papan. Papan bersifat opsional; bila diketahui isi <code>RG</code>, <code>NG</code>, atau <code>TN</code>. Ekspor IPOT dapat langsung diunggah.</p></details>
      </div>
      <div class="card">
        <h2>2. Konfirmasi tambahan <span style="font-weight:400">(opsional)</span></h2>
        <p class="hint">Input tambahan mengikuti kode saham dan tersimpan selama sesi ini. Saat ganti saham, input saham sebelumnya disimpan terpisah.</p>
        <details class="py-context"><summary>Harga &amp; volume harian</summary>
          <p>Tempel CSV dengan header <code>date,close,prev_close,volume,avg_volume</code>. Harga dalam rupiah; volume dalam lembar. <code>avg_volume</code> adalah rata-rata pembanding yang Anda sediakan, misalnya 20 sesi sebelumnya. Tanggal ISO <code>YYYY-MM-DD</code>.</p>
          <label class="py-label" for="py-prices">CSV harga dan volume</label>
          <textarea id="py-prices" spellcheck="false" placeholder="date,close,prev_close,volume,avg_volume"></textarea>
        </details>
        <details class="py-context"><summary>Fundamental dengan tanggal publikasi</summary>
          <p>Gunakan angka yang sudah tersedia pada tanggal analisis. ROE dan pertumbuhan laba dalam persen: masukkan <b>15</b> untuk 15%. Tidak ada nilai asumsi yang diisi otomatis.</p>
          <div class="py-fund-grid">
            <label class="py-label py-span">Tanggal data tersedia untuk publik<input type="date" id="py-fund-date"></label>
            <label class="py-label">ROE (%)<input type="number" step="any" id="py-roe" placeholder="Opsional"></label>
            <label class="py-label">Pertumbuhan laba bersih (%)<input type="number" step="any" id="py-growth" placeholder="Opsional"></label>
            <label class="py-label">Debt / equity (×)<input type="number" step="any" id="py-debt" placeholder="Opsional"></label>
            <label class="py-label">P/E (×)<input type="number" step="any" id="py-pe" placeholder="Opsional"></label>
          </div>
        </details>
        <details class="py-context"><summary>Running trade &amp; kandidat crossing</summary>
          <p>CSV header <code>time,price,lot,buyer,seller,board</code>; tambahkan <code>date,ticker,trade_id</code> bila tersedia. Satu saham dan satu sesi per tape. Kode papan: <code>RG</code> reguler, <code>NG</code> negosiasi, <code>TN</code> tunai. Kolom broker boleh kosong.</p>
          <div class="py-inline"><label class="py-label">Buka file running trade<input type="file" id="py-tape-file" accept=".txt,.csv,.tsv"></label><button class="btn small" id="py-sample-sdmu" type="button">Muat SDMU · 24 Sep 2026</button></div>
          <div class="py-inline"><label class="py-label">Satuan kolom Qty<select id="py-tape-unit"><option value="">Pilih bila header memakai Qty</option><option value="lot">Lot · 100 lembar per lot</option><option value="shares">Lembar saham</option></select></label><label class="py-label">Tanggal sesi bila tidak ada di tape<input type="date" id="py-tape-date"></label></div>
          <p>Format TXT <code>Time Stock Brd Price Qty BT BC SC ST</code> juga didukung. <code>BC</code> = broker beli, <code>SC</code> = broker jual; pilih satuan Qty sesuai ekspor Anda.</p>
          <label class="py-label" for="py-tape">CSV / TXT running trade</label>
          <textarea id="py-tape" spellcheck="false" placeholder="time,price,lot,buyer,seller,board,date,ticker,trade_id"></textarea>
          <p>Broker beli = broker jual hanya kandidat transaksi dalam broker yang sama; bukan bukti pemilik yang sama atau manipulasi.</p>
          <div class="py-inline"><button class="btn primary small" id="py-check-tape" type="button">Periksa crossing tape</button><span class="hint">Bisa dipakai tanpa broker summary.</span></div>
          <details class="py-demo-controls"><summary>Coba skenario sintetis</summary>
            <label class="py-label">Pola simulasi<select id="py-pair-demo-case"><option value="rising">Dua arah · harga naik</option><option value="ring3">Siklus 3 broker · harga naik</option><option value="ring4">Siklus 4 broker · harga naik</option><option value="flat">Dua arah · harga datar</option><option value="oneway">Satu arah · harga naik</option><option value="broad">Harga naik · banyak broker lain</option></select></label>
            <button class="btn small" id="py-pair-demo" type="button">Muat simulasi ke tape</button><p>Mengganti isi tape dengan data buatan saham DEMO; tidak menggambarkan perdagangan broker mana pun.</p>
          </details>
        </details>
      </div>
    </div>
    <div class="py-actions"><button class="btn primary" id="py-analyze" type="button">Analisis akumulasi</button><span class="py-status" id="py-status" role="status" aria-live="polite">Pilih file broker summary untuk memulai.</span></div>
    <div id="py-tape-only-output" hidden></div>
    <div class="py-empty" id="py-empty"><b>Bukti yang lengkap membuat hasil lebih bermakna.</b>Data yang belum tersedia ditandai; skor tetap menampilkan cakupan bukti yang benar-benar digunakan.</div>
    <div class="py-results" id="py-results" hidden></div>
    <details class="py-method"><summary>Metode, satuan, dan batas interpretasi</summary>
      <p><b>Net value</b> = nilai beli − nilai jual; <b>net lot</b> = lot beli − lot jual. VWAP beli = total nilai beli / total lembar beli, bukan modal bersih atau harga persediaan akhir. Konversi 1 lot = 100 lembar mengacu pada satuan perdagangan saham pasar reguler: <a href="https://www.idx.id/en/products-services/trading-hours-and-mechanism/" target="_blank" rel="noopener noreferrer">mekanisme perdagangan BEI</a>.</p>
      <p>Konsentrasi top-3 memakai total net buying positif sebagai penyebut. HHI adalah jumlah kuadrat pangsa tersebut (0–1). Konsistensi memakai hari berbeda yang tersedia; ekspor rentang tanggal tidak dianggap sebagai bukti harian. Kode broker mewakili perantara banyak nasabah dan tidak mengidentifikasi pemilik manfaat.</p>
      <p>Skor heuristik berbobot: arus broker 25%, konsentrasi 15%, konsistensi 20%, harga 15%, volume 15%, fundamental 10%. Skor dinormalisasi terhadap komponen yang tersedia; cakupan menunjukkan jumlah bobot yang terisi. Setiap metrik fundamental menyumbang seperempat bobot fundamental; metrik yang kosong mengurangi cakupan. Skor bukan probabilitas kenaikan, rekomendasi transaksi, atau hasil backtest. Data tambahan yang tanggalnya tidak sesuai dikeluarkan dari bukti.</p>
      <p>Analisis baru diproses oleh server Python lokal. Input baru tidak disimpan otomatis. Tab dashboard lama tetap tersedia melalui tab Input Data dan Analisis.</p>
      <p>Format otomatis pada broker summary menganggap pemisah tunggal dengan tiga digit akhir sebagai pemisah ribuan, kecuali angka bersufiks atau pecahan 0.xxx. Tape menolak format yang ambigu. Pilih format Inggris atau Indonesia jika sumber memakai desimal tiga digit.</p>
    </details>`;

  function status(message, kind = '') {
    byId('py-status').textContent = message;
    byId('py-status').dataset.kind = kind;
  }

  function setBusy(value) {
    state.busy = value;
    host.setAttribute('aria-busy', String(value));
    for (const control of host.querySelectorAll('input,select,textarea,button')) control.disabled = value;
    if (!value) {
      byId('py-clear').disabled = !state.files.length;
      for (const id of ['py-export-json','py-export-csv']) if (byId(id)) byId(id).disabled = state.stale || !state.result;
      if (byId('py-export-tape')) byId('py-export-tape').disabled = state.tapeStale || !state.tapeResult;
    }
    byId('py-analyze').textContent = value ? 'Memproses…' : 'Analisis akumulasi';
  }

  function markStale() {
    if (state.tapeResult) {
      state.tapeStale = true;
      const tapeNote = byId('py-tape-stale');
      if (tapeNote) tapeNote.hidden = false;
      if (byId('py-export-tape')) byId('py-export-tape').disabled = true;
    }
    if (!state.result) return;
    state.stale = true;
    const note = byId('py-stale');
    if (note) note.hidden = false;
    for (const id of ['py-export-json','py-export-csv']) if (byId(id)) byId(id).disabled = true;
    status('Input berubah. Jalankan analisis lagi untuk memperbarui hasil.');
  }

  function switchContext(ticker) {
    const next = ticker.trim().toUpperCase();
    if (next === state.contextTicker) return;
    state.contexts.set(state.contextTicker, contextIds.map(id => byId(id).value));
    const saved = state.contexts.get(next) || [];
    contextIds.forEach((id, i) => { byId(id).value = saved[i] || ''; });
    state.contextTicker = next;
    markStale();
  }

  function inferTicker(file) {
    return file.text.slice(0, 500).match(/(?:^|[\t,;])([A-Z][A-Z0-9]{1,15})ToBrokerCode/i)?.[1]?.toUpperCase() || '';
  }

  function renderFiles() {
    const tickers = [...new Set(state.files.map(inferTicker).filter(Boolean))].sort();
    byId('py-tickers').innerHTML = tickers.map(t => `<option value="${esc(t)}"></option>`).join('');
    byId('py-file-count').textContent = state.files.length ? `${state.files.length} file dipilih${tickers.length ? ` · ${tickers.join(', ')}` : ''}` : 'Belum ada file dipilih';
    byId('py-file-list').innerHTML = state.files.map((file, index) => `<li><span>${esc(file.name)}</span><button class="py-remove" type="button" data-remove-file="${index}" aria-label="Hapus ${esc(file.name)}">Hapus</button></li>`).join('');
    byId('py-clear').disabled = !state.files.length;
    if (tickers.length === 1 && !byId('py-ticker').value.trim()) byId('py-ticker').value = tickers[0];
    switchContext(byId('py-ticker').value);
  }

  async function api(path, options = {}) {
    if (location.protocol === 'file:') throw new Error('Jalankan python app.py dari folder proyek, lalu buka http://127.0.0.1:8765. Analisis Python memerlukan server lokal.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch(path, {...options, signal:controller.signal});
      let result;
      try { result = await response.json(); }
      catch (_) { throw new Error('Respons API tidak terbaca. Jalankan python app.py dan buka alamat server lokal yang ditampilkan.'); }
      if (!response.ok) throw new Error(result.error || `Permintaan gagal (${response.status}).`);
      byId('py-engine').textContent = 'Python lokal · terhubung';
      return result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Analisis terlalu lama. Kurangi jumlah file dan coba lagi.');
      if (error instanceof TypeError) {
        byId('py-engine').textContent = 'Python lokal · belum terhubung';
        throw new Error('Server Python belum terhubung. Jalankan python app.py dari folder proyek, lalu buka http://127.0.0.1:8765.');
      }
      throw error;
    } finally { clearTimeout(timeout); }
  }

  function addFiles(files) {
    let added = 0;
    for (const file of files) {
      if (!state.files.some(previous => previous.name === file.name && previous.text === file.text)) {
        state.files.push(file);
        added += 1;
      }
    }
    renderFiles();
    markStale();
    return added;
  }

  byId('py-files').addEventListener('change', async event => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    setBusy(true);
    status('Membaca file…');
    try {
      if (selected.some(file => file.size > 8 * 1024 * 1024)) throw new Error('Ukuran setiap file maksimum 8 MB. Pisahkan file yang lebih besar.');
      const files = await Promise.all(selected.map(async file => ({name:file.name, text:await file.text()})));
      if (files.some(file => file.text.includes('\0'))) throw new Error('File biner tidak didukung. Ekspor dahulu ke CSV, TSV, atau TXT.');
      const added = addFiles(files);
      status(`${added} file ditambahkan. ${state.files.length} file siap dianalisis.${state.result ? ' Hasil lama belum diperbarui.' : ''}`);
    } catch (error) { status(error.message, 'error'); }
    finally { event.target.value = ''; setBusy(false); }
  });

  async function loadSamples(ticker) {
    setBusy(true);
    status(`Memuat file harian ${ticker} dari folder proyek…`);
    try {
      if (!state.samples) state.samples = (await api('/api/samples')).files || [];
      const all = state.samples.filter(file => String(file.ticker || '').toUpperCase() === ticker);
      const selected = all.filter(file => file.single_day !== false);
      if (!selected.length) throw new Error(`File contoh harian ${ticker} tidak ditemukan.`);
      const files = await Promise.all(selected.map(file => api(`/api/sample?name=${encodeURIComponent(file.name)}`)));
      const added = addFiles(files);
      byId('py-ticker').value = ticker;
      switchContext(ticker);
      markStale();
      const skipped = all.length - selected.length;
      status(`${added} file harian ${ticker} ditambahkan.${skipped ? ` ${skipped} ekspor rentang tanggal dilewati untuk mencegah tumpang tindih.` : ''} Klik Analisis akumulasi.`);
    } catch (error) { status(error.message, 'error'); }
    finally { setBusy(false); }
  }
  byId('py-sample-raja').addEventListener('click', () => loadSamples('RAJA'));
  byId('py-sample-bbri').addEventListener('click', () => loadSamples('BBRI'));
  byId('py-clear').addEventListener('click', () => {
    state.files = [];
    byId('py-ticker').value = '';
    renderFiles();
    markStale();
    if (!state.result) status('Pilih file broker summary untuk memulai.');
  });
  byId('py-file-list').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-file]');
    if (!button || state.busy) return;
    state.files.splice(Number(button.dataset.removeFile), 1);
    renderFiles();
    markStale();
  });
  for (const id of ['py-ticker','py-number-format',...contextIds]) byId(id).addEventListener('input', markStale);
  byId('py-ticker').addEventListener('change', () => switchContext(byId('py-ticker').value));

  byId('py-tape-file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error('File tape maksimum 8 MB.');
      const text = await file.text();
      if (text.includes('\0')) throw new Error('Gunakan file teks UTF-8, CSV, atau TSV.');
      byId('py-tape').value = text;
      byId('py-tape-date').value = '';
      byId('py-tape-unit').value = '';
      markStale();
      status(`${file.name} dimuat. Periksa satuan Qty dan tanggal sesi, lalu Periksa crossing tape.`);
    } catch (error) { status(error.message, 'error'); }
    finally { event.target.value = ''; setBusy(false); }
  });

  byId('py-sample-sdmu').addEventListener('click', async () => {
    setBusy(true);
    try {
      const sample = await api('/api/tape-sample');
      byId('py-tape').value = sample.text;
      byId('py-tape-date').value = sample.session_date || '';
      byId('py-tape-unit').value = '';
      byId('py-number-format').value = 'en';
      markStale();
      status('SDMU dimuat. Tanggal mengikuti nama file; angka memakai koma ribuan. Pilih satuan Qty, lalu Periksa crossing tape.');
    } catch (error) { status(error.message, 'error'); }
    finally { setBusy(false); }
  });

  function tapeOptions() {
    return {quantity_unit:byId('py-tape-unit').value || undefined, session_date:byId('py-tape-date').value || undefined};
  }

  byId('py-pair-demo').addEventListener('click', () => {
    const pattern = byId('py-pair-demo-case').value;
    const rows = ['date,ticker,time,price,lot,buyer,seller,board,trade_id'];
    for (let i = 0; i < 12; i++) {
      const seconds = i * 8;
      const time = `09:${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
      const price = pattern === 'flat' ? 2500 : 2500 + i * 10;
      const forward = pattern === 'oneway' || i % 2 === 0;
      const ring = pattern === 'ring3' ? ['AA','BB','CC'] : pattern === 'ring4' ? ['AA','BB','CC','DD'] : null;
      const buyer = ring ? ring[i % ring.length] : forward ? 'AA' : 'ZZ';
      const seller = ring ? ring[(i+1) % ring.length] : forward ? 'ZZ' : 'AA';
      rows.push(`2026-01-02,DEMO,${time},${price},100,${buyer},${seller},RG,synthetic-${i}`);
      if (pattern === 'broad') rows.push(`2026-01-02,DEMO,${time},${price},900,CC,DD,RG,background-${i}`);
    }
    byId('py-tape').value = rows.join('\n');
    byId('py-tape-unit').value = '';
    byId('py-tape-date').value = '';
    markStale();
    status('Simulasi DEMO dimuat. Klik Periksa crossing tape; ini data buatan, bukan transaksi aktual.');
  });

  byId('py-check-tape').addEventListener('click', async () => {
    if (state.busy) return;
    const running_trade = byId('py-tape').value.trim();
    if (!running_trade) return status('Tempel running trade dengan waktu, harga, lot, buyer, seller, dan papan RG.', 'error');
    setBusy(true);
    status('Memeriksa pasangan dan kelompok 3–4 broker, arus internal, dan perubahan harga…');
    try {
      const tape = await api('/api/tape', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({running_trade,number_format:byId('py-number-format').value,...tapeOptions()})});
      state.tapeResult = tape;
      state.tapeStale = false;
      const output = byId('py-tape-only-output');
      output.hidden = false;
      output.innerHTML = `<div class="py-stale mt" id="py-tape-stale" hidden>Input berubah; periksa tape kembali untuk memperbarui hasil di bawah.</div><div class="py-results-head mt"><div><h2>Pemeriksaan tape · ${esc(tape.input?.ticker || 'saham tidak tercantum')}</h2><p>${esc(tape.input?.date || 'Tanggal tidak tercantum')} · ${esc(num(tape.summary?.trade_count))} transaksi</p></div><button class="btn small" id="py-export-tape" type="button">Ekspor tape JSON</button></div>${tape.input?.ticker === 'DEMO' ? '<div class="py-stale">SIMULASI SINTETIS · hasil ini berasal dari data buatan, bukan temuan terhadap broker.</div>' : ''}${renderTape(tape)}`;
      byId('py-export-tape').addEventListener('click', () => {
        if (!state.tapeResult || state.tapeStale) return;
        download(JSON.stringify(state.tapeResult,null,2), 'application/json;charset=utf-8', 'json', {ticker:tape.input?.ticker,period:{end:tape.input?.date}}, 'tape');
      });
      const eligible = (tape.pair_price_surveillance?.candidates || []).filter(pair => pair.eligibility?.eligible).length;
      const groups = (tape.group_price_surveillance?.candidates || []).filter(group => group.eligibility?.eligible).length;
      byId('py-empty').hidden = true;
      status(`Tape selesai · ${num(tape.summary?.trade_count)} transaksi · ${num(eligible)} pasangan dan ${num(groups)} kelompok memenuhi ambang pada hasil yang ditampilkan. Hasil dapat saling tumpang tindih.`, 'success');
    } catch (error) {
      markStale();
      status(error.message, 'error');
    } finally { setBusy(false); }
  });

  // CSV quoting is handled before splitting numeric fields. A semicolon or tab
  // delimiter is convenient for unquoted decimal-comma numbers.
  function parseCsv(text) {
    const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/).find(line => line.trim()) || '';
    const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (quoted && text[i+1] === '"') { field += '"'; i += 1; }
        else quoted = !quoted;
      } else if (ch === delimiter && !quoted) { row.push(field.trim()); field = ''; }
      else if ((ch === '\n' || ch === '\r') && !quoted) {
        if (ch === '\r' && text[i+1] === '\n') i += 1;
        row.push(field.trim());
        if (row.some(value => value !== '')) rows.push(row);
        row = []; field = '';
      } else field += ch;
    }
    if (quoted) throw new Error('CSV harga: tanda kutip belum ditutup.');
    row.push(field.trim());
    if (row.some(value => value !== '')) rows.push(row);
    return rows;
  }

  function priceRows() {
    const text = byId('py-prices').value.trim();
    if (!text) return undefined;
    const rows = parseCsv(text);
    const header = (rows.shift() || []).map(key => key.replace(/^\uFEFF/, '').trim().toLowerCase());
    const allowed = ['date','close','prev_close','volume','avg_volume'];
    if (!header.includes('date') || !header.includes('close')) throw new Error('CSV harga harus memiliki header date dan close.');
    if (new Set(header).size !== header.length || header.some(key => !allowed.includes(key))) throw new Error('Header CSV harga yang didukung: date,close,prev_close,volume,avg_volume. Jangan ulangi nama kolom.');
    if (!rows.length) throw new Error('CSV harga hanya berisi header; tambahkan baris data atau kosongkan kolom.');
    return rows.map((row, index) => {
      if (row.length !== header.length) throw new Error(`CSV harga baris ${index + 2}: jumlah kolom tidak sesuai header. Gunakan kutip untuk angka yang memuat koma atau pemisah titik koma.`);
      const value = {};
      header.forEach((key, i) => { if (row[i] !== '') value[key] = row[i]; });
      if (!value.date || value.close == null) throw new Error(`CSV harga baris ${index + 2}: date dan close wajib diisi.`);
      return value;
    });
  }

  function fundamentals() {
    const result = {};
    const date = byId('py-fund-date').value;
    if (date) result.as_of = date;
    for (const [id, key] of [['py-roe','roe'],['py-growth','net_profit_growth'],['py-debt','debt_to_equity'],['py-pe','pe']]) {
      const element = byId(id), value = element.value.trim();
      if (element.validity.badInput) throw new Error('Angka fundamental tidak valid.');
      if (value !== '') {
        const n = Number(value);
        if (!Number.isFinite(n)) throw new Error('Angka fundamental tidak valid.');
        result[key] = n;
      }
    }
    return Object.keys(result).length ? result : undefined;
  }

  byId('py-analyze').addEventListener('click', async () => {
    if (state.busy) return;
    if (!state.files.length) { status('Unggah broker summary atau muat file contoh terlebih dahulu.', 'error'); return; }
    let payload;
    try {
      switchContext(byId('py-ticker').value);
      payload = {files:state.files, number_format:byId('py-number-format').value};
      const ticker = byId('py-ticker').value.trim().toUpperCase();
      if (ticker) payload.ticker = ticker;
      const prices = priceRows(), fund = fundamentals(), tape = byId('py-tape').value.trim();
      if (prices) payload.prices = prices;
      if (fund) payload.fundamentals = fund;
      if (tape) Object.assign(payload, {running_trade:tape}, tapeOptions());
    } catch (error) { status(error.message, 'error'); return; }
    setBusy(true);
    status('Menghitung net flow, konsistensi, dan cakupan bukti…');
    try {
      const result = await api('/api/analyze', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
      state.result = result;
      state.stale = false;
      renderResult();
      status(`${result.ticker} selesai · ${num(result.brokers?.length || 0)} broker · ${num(result.period?.observed_days || 0)} hari teramati.`, 'success');
    } catch (error) {
      markStale();
      status(error.message, 'error');
    } finally { setBusy(false); }
  });

  function stat(label, value, detail, className = '') {
    return `<div class="py-stat"><div class="py-stat-label">${esc(label)}</div><div class="py-stat-value ${className}">${esc(value)}</div><div class="py-stat-detail">${esc(detail)}</div></div>`;
  }

  function table(headers, rows, emptyText = 'Data belum tersedia.') {
    return `<div class="scrolltable"><table class="py-table"><thead><tr>${headers.map((label, i) => `<th${i ? ' class="num"' : ''}>${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${headers.length}" class="empty">${esc(emptyText)}</td></tr>`}</tbody></table></div>`;
  }

  function brokerRows(brokers) {
    return brokers.map(broker => `<tr>
      <td class="py-code">${esc(broker.code)}</td>
      <td class="num ${signedClass(broker.net_value)}" title="${esc(money(broker.net_value))}">${esc(compact(broker.net_value))}</td>
      <td class="num ${signedClass(broker.net_lot)}">${esc(num(broker.net_lot,2))}</td>
      <td class="num">${esc(num(broker.avg_buy_price, 2))}</td>
      <td class="num">${esc(num(broker.avg_sell_price, 2))}</td>
      <td class="num">${esc(num(broker.net_buy_days))} / ${esc(num(broker.observed_days))}</td>
      <td class="num">${esc(pct(broker.consistency_pct))}</td>
      <td class="num">${esc(pct(broker.positive_net_share_pct))}</td>
      </tr>`);
  }

  function renderBrokerTable() {
    const query = (byId('py-broker-filter')?.value || '').trim().toUpperCase();
    const brokers = (state.result.brokers || []).filter(broker => broker.code.toUpperCase().includes(query));
    byId('py-brokers').innerHTML = table(['Broker','Net value (Rp)','Net lot','VWAP beli (Rp)','VWAP jual (Rp)','Hari net beli / teramati','Konsistensi','Pangsa net positif'], brokerRows(brokers), 'Tidak ada broker yang cocok.');
  }

  function renderSummarySurveillance(report) {
    if (!report) return '';
    const coverage = report.coverage || {}, watchlist = report.watchlist || [], config = report.config || {};
    const brokers = report.brokers || [], days = coverage.dates || [...new Set((report.daily_observations || []).map(row => row.date))].sort();
    const conflictBrokers = brokers.filter(broker => broker.net_value_volume_conflict === true);
    return `<section class="card mt py-summary-crossing" id="py-summary-crossing" aria-label="Membaca crossing dari broker summary">
      <div class="py-inline py-between"><h2>Membaca crossing dari broker summary</h2><span class="py-summary-level">Bukti: rekap per broker</span></div>
      <p class="py-interpretation"><b>Broker summary menunjukkan aktivitas beli dan jual, tetapi tidak menunjukkan siapa bertransaksi dengan siapa.</b> Bagian ini membantu memilih broker dan tanggal yang layak diperiksa melalui running trade. Beli-jual yang seimbang belum membuktikan crossing.</p>
      <div class="py-summary-stats">
        ${stat('Hari teramati',num(coverage.observed_dates || 0),`${num(coverage.excluded_period_exports || 0)} ekspor rentang dikeluarkan dari pemeriksaan harian`)}
        ${stat('Daftar untuk diperiksa',num(watchlist.length),'Memenuhi ambang aktivitas dua arah; tidak menyatakan crossing terjadi')}
        ${stat('Cakupan dua sisi',pct(coverage.balance_covered_gross_pct),'Porsi gross dengan sisi beli dan jual sama-sama dilaporkan')}
      </div>
      <div class="py-summary-reading"><div><b>Perhatikan hari yang sama</b><p>Beli pada satu hari lalu jual pada hari lain dapat membuat net periode kecil. Keseimbangan harian memeriksa dua sisi pada tanggal yang sama.</p></div><div><b>Bedakan nilai dan jumlah saham</b><p>Net value dipengaruhi harga beli dan jual. Net lot menunjukkan selisih jumlah saham; keduanya dapat memiliki arah yang berbeda.</p></div></div>
      ${conflictBrokers.length ? `<p class="py-summary-alert"><b>Arah nilai dan volume berbeda pada total periode:</b> ${conflictBrokers.map(broker => `${esc(broker.code)} (net nilai ${esc(money(broker.net_value))}; net lot ${esc(num(broker.net_lot,2))})`).join('; ')}. Net value positif tidak selalu berarti jumlah saham bertambah. Contoh satu hari di bawah dapat memiliki arah berbeda dari total periode.</p>` : ''}
      <div class="py-inline py-summary-watchlist"><span class="hint">Prioritas pemeriksaan:</span>${watchlist.length ? watchlist.map(broker => `<button class="btn small" type="button" data-summary-broker="${esc(broker.code)}">${esc(broker.code)} · ${esc(num(broker.high_balance_dates))} hari seimbang</button>`).join('') : '<span class="hint">Belum ada broker yang memenuhi seluruh ambang pada data harian ini.</span>'}</div>
      ${watchlist.length ? '<p class="py-table-note">Setiap broker di daftar ini dinilai sendiri. Daftar ini tidak mengidentifikasi pasangan atau kelompok yang bertransaksi satu sama lain.</p>' : ''}
      <div class="py-inline py-summary-controls">
        <label class="py-label">Pilih broker<select id="py-summary-broker"><option value="">Semua broker</option>${brokers.map(broker => `<option value="${esc(broker.code)}">${esc(broker.code)}</option>`).join('')}</select></label>
        <label class="py-label">Pilih tanggal untuk rincian harian<select id="py-summary-date"><option value="">Semua tanggal</option>${days.map(day => `<option value="${esc(day)}">${esc(day)}</option>`).join('')}</select></label>
      </div>
      <div id="py-summary-example" aria-live="polite"></div>
      <details class="py-summary-detail" open><summary>Rincian harian · baca beli, jual, dan net bersama</summary><div id="py-summary-daily"></div></details>
      <details class="py-summary-detail" id="py-summary-period-details"><summary>Ringkasan sepanjang periode · jangan samakan net kecil dengan crossing</summary><div id="py-summary-period"></div><p class="py-table-note">Keseimbangan harian dihitung hanya pada tanggal dengan kedua sisi dilaporkan. Net periode adalah jumlah nilai yang disuplai; sisi yang tidak dilaporkan membuatnya tidak lengkap. Pangsa gross memakai total beli + jual semua broker dalam data, bukan nilai transaksi pasar satu sisi. Pergantian peran membandingkan dua tanggal unggahan yang berdekatan dan net-nya bukan nol; baris broker yang tidak tersedia pada salah satu tanggal unggahan, sisi tidak lengkap, atau net nol memutus perbandingan. Jarak antartanggal unggahan tidak dianggap sebagai sesi bursa berturut-turut.</p></details>
      <details class="py-summary-detail"><summary>Rumus dan batas bukti</summary>
        <p class="py-interpretation">Gross = beli + jual. Net = beli − jual. Net absolut/gross = |net| / gross × 100%; rasio ini bukan persediaan saham atau saldo nasabah. Keseimbangan satu hari = 2 × min(beli, jual) / gross × 100%. Keseimbangan lintas hari memakai jumlah minimum harian, sehingga beli hari pertama dan jual hari berikutnya tidak dianggap saling berpasangan.</p>
        <p class="py-interpretation">Daftar pemeriksaan memakai ambang heuristik: keseimbangan harian ≥${esc(pct(config.min_same_day_balance_pct ?? 80,0))}, pangsa gross periode ≥${esc(pct(config.min_gross_share_pct ?? 5,0))}, minimal ${esc(num(config.min_high_balance_dates ?? 3))} hari lengkap dengan keseimbangan ≥${esc(pct(config.min_same_day_balance_pct ?? 80,0))}, dan cakupan gross dua sisi ≥${esc(pct(config.min_balance_covered_gross_pct ?? 80,0))}. Ambang tersebut memilih bahan pemeriksaan, bukan probabilitas crossing. Harga rata-rata beli/jual yang berdekatan juga tidak mengungkap lawan transaksi.</p>
        <ul class="py-warning-list">${(report.warnings || []).map(item => `<li>${esc(item)}</li>`).join('')}</ul>
      </details>
      <div class="py-summary-next"><p><b>Langkah berikutnya:</b> tambahkan seluruh running trade saham pada tanggal pilihan dengan waktu, harga, jumlah, broker beli, broker jual, dan papan. Rekap ini sendiri tidak dapat mengidentifikasi pasangan 2 broker atau kelompok 3–4 broker.</p><button class="btn" type="button" data-summary-open-tape>${state.result?.tape ? 'Buka input running trade' : 'Tambahkan running trade'}</button></div>
    </section>`;
  }

  function renderSummaryDrilldown() {
    const report = state.result?.summary_surveillance;
    if (!report || !byId('py-summary-example')) return;
    const code = byId('py-summary-broker').value, date = byId('py-summary-date').value;
    const brokers = (report.brokers || []).filter(broker => !code || broker.code === code);
    let days = (report.daily_observations || []).filter(day => (!code || day.code === code) && (!date || day.date === date));
    if (!code && !date) days = (report.top_observations || []).length ? report.top_observations : days;
    else days = [...days].sort((a,b) => code ? a.date.localeCompare(b.date) : (b.gross_value || 0) - (a.gross_value || 0));
    const shown = days.slice(0,100);
    const example = shown.find(day => day.complete_sides && day.gross_value > 0) || shown[0];
    if (example) {
      const complete = example.complete_sides && example.buy_value != null && example.sell_value != null && example.gross_value > 0;
      const buyWidth = complete ? fractionWidth(example.buy_value / example.gross_value * 100) : 0;
      const sellWidth = complete ? fractionWidth(example.sell_value / example.gross_value * 100) : 0;
      const netWidth = complete ? fractionWidth(example.absolute_net_to_gross_pct) : 0;
      byId('py-summary-example').innerHTML = `<div class="py-summary-example"><div class="py-inline py-between"><h3>${esc(example.code)} · ${esc(example.date)} <span>contoh dari file yang dianalisis</span></h3><button class="btn small" type="button" data-summary-broker="${esc(example.code)}" data-summary-date="${esc(example.date)}">Fokus ke baris ini</button></div>
        ${complete ? `<div class="py-summary-bars" role="img" aria-label="${esc(`Gross beli dan jual ${money(example.gross_value)}; net ${money(example.net_value)}; keseimbangan ${pct(example.same_day_balance_pct)}; rasio net absolut ${pct(example.absolute_net_to_gross_pct)}`)}">
          <div class="py-summary-bar-label"><span><i class="py-summary-dot py-summary-buy"></i>Beli ${esc(money(example.buy_value))}</span><span><i class="py-summary-dot py-summary-sell"></i>Jual ${esc(money(example.sell_value))}</span></div>
          <div class="py-summary-gross-bar"><span class="py-summary-buy" style="width:${buyWidth}%"></span><span class="py-summary-sell" style="width:${sellWidth}%"></span></div>
          <div class="py-summary-bar-label"><span>Net ${esc(money(example.net_value))}</span><span>|Net| / gross ${esc(pct(example.absolute_net_to_gross_pct))}</span></div>
          <div class="py-summary-net-bar"><span style="width:${netWidth}%;background:${Number(example.net_value) < 0 ? 'var(--neg)' : 'var(--aqua)'}"></span></div>
        </div><p class="py-interpretation">Keseimbangan <b>${esc(pct(example.same_day_balance_pct))}</b> menggambarkan kemiripan total beli dan jual pada hari itu. Kedua batang membandingkan nilai; tidak menghubungkan transaksi beli dengan transaksi jual tertentu.</p>` : '<p class="py-interpretation">Salah satu sisi tidak dilaporkan atau gross bernilai nol. Keseimbangan dan perbandingan dua arah tidak disimpulkan dari baris ini.</p>'}
        <p class="py-table-note">Net lot: <b class="${signedClass(example.net_lot)}">${esc(num(example.net_lot,2))}</b>. ${example.net_value_volume_conflict === true ? 'Arah nilai dan volume berbeda; jangan menyimpulkan penambahan saham hanya dari net value.' : 'Net lot memakai jumlah, sedangkan net value juga dipengaruhi harga.'}</p></div>`;
    } else byId('py-summary-example').innerHTML = '<p class="py-interpretation">Tidak ada observasi harian untuk pilihan ini. Ekspor rentang tanggal tidak dijadikan observasi harian.</p>';
    const dailyRows = shown.map(day => `<tr><td><button class="py-summary-row-link" type="button" data-summary-broker="${esc(day.code)}" data-summary-date="${esc(day.date)}">${esc(day.date)}</button></td><td class="num py-code">${esc(day.code)}</td><td class="num">${esc(compact(day.buy_value))}</td><td class="num">${esc(compact(day.sell_value))}</td><td class="num ${signedClass(day.net_value)}">${esc(compact(day.net_value))}${day.complete_sides ? '' : ' *'}</td><td class="num ${signedClass(day.net_lot)}">${esc(num(day.net_lot,2))}${day.net_value_volume_conflict === true ? ' ↕' : ''}</td><td class="num">${esc(pct(day.same_day_balance_pct))}</td><td class="num">${esc(pct(day.gross_share_pct))}</td><td class="num">${esc(pct(day.average_price_gap_pct,2))}</td><td>${day.complete_sides ? 'Dua sisi dilaporkan' : 'Sisi belum lengkap'}</td></tr>`);
    byId('py-summary-daily').innerHTML = `<p class="py-table-note">${!code && !date ? 'Menampilkan observasi dengan pangsa gross dan keseimbangan menonjol; gunakan pilihan broker/tanggal untuk melihat rincian lain.' : `Menampilkan ${num(shown.length)} dari ${num(days.length)} observasi yang cocok.`}</p>${table(['Tanggal','Broker','Beli (Rp)','Jual (Rp)','Net (Rp)','Net lot','Seimbang','Pangsa gross','Selisih VWAP','Cakupan'],dailyRows,'Tidak ada data harian untuk pilihan ini.')}<p class="py-table-note">* Net dari sisi yang disuplai saja, bukan net lengkap. Tanda ↕ berarti arah net nilai dan net lot berbeda. Nilai yang tidak tersedia ditampilkan sebagai —.</p>`;
    const periodRows = brokers.map(broker => `<tr><td class="py-code">${esc(broker.code)}</td><td class="num">${esc(compact(broker.gross_value))}</td><td class="num ${signedClass(broker.net_value)}">${esc(compact(broker.net_value))}${broker.one_side_unreported_dates ? ' *' : ''}</td><td class="num ${signedClass(broker.net_lot)}">${esc(num(broker.net_lot,2))}${broker.net_value_volume_conflict === true ? ' ↕' : ''}</td><td class="num">${esc(pct(broker.absolute_net_to_gross_pct))}</td><td class="num">${esc(pct(broker.same_day_balance_pct))}</td><td class="num">${esc(pct(broker.balance_covered_gross_pct))}</td><td class="num">${esc(num(broker.high_balance_dates))}</td><td class="num">${esc(num(broker.role_switches))} / ${esc(num(broker.comparable_adjacent_pairs))}</td><td>${broker.review_flag ? 'Periksa dengan tape' : 'Ambang belum terpenuhi'}</td></tr>`);
    byId('py-summary-period').innerHTML = table(['Broker','Gross (Rp)','Net periode (Rp)','Net lot','|Net| / gross','Seimbang harian','Cakupan dua sisi',`Hari ≥${pct(report.config?.min_same_day_balance_pct ?? 80,0)}`,'Ganti peran / pasangan hari','Tindak lanjut'],periodRows);
  }

  function bindSummarySurveillance() {
    const section = byId('py-summary-crossing');
    if (!section) return;
    byId('py-summary-broker').addEventListener('change', renderSummaryDrilldown);
    byId('py-summary-date').addEventListener('change', renderSummaryDrilldown);
    section.addEventListener('click', event => {
      const pick = event.target.closest('[data-summary-broker]');
      if (pick) {
        byId('py-summary-broker').value = pick.dataset.summaryBroker;
        byId('py-summary-date').value = pick.dataset.summaryDate || '';
        if (!pick.dataset.summaryDate) byId('py-summary-period-details').open = true;
        renderSummaryDrilldown();
        return;
      }
      if (event.target.closest('[data-summary-open-tape]')) {
        const input = byId('py-tape');
        const details = input.closest('details');
        if (details) details.open = true;
        input.scrollIntoView({behavior:'smooth', block:'center'});
        input.focus({preventScroll:true});
      }
    });
    renderSummaryDrilldown();
  }

  function renderTapeExplanation(report) {
    if (!report) return '';
    const coverage = report.coverage || {};
    const displayValue = (value, unit = '') => value == null ? 'Belum tersedia' : typeof value === 'boolean' ? (value ? 'Ya' : 'Tidak') : typeof value === 'number' ? `${num(value,unit === 'prints' || unit === 'shares' ? 0 : 2)}${unit === '%' ? '%' : unit === 'prints' ? ' print' : unit === 'shares' ? ' lembar' : ''}` : String(value);
    const examples = (report.examples || []).map(example => {
      const price = example.price_context || {};
      const edges = (example.edges || []).map(edge => `<tr><td class="py-code">${esc(edge.seller)} → ${esc(edge.buyer)}</td><td class="num">${esc(num(edge.count))}</td><td class="num">${esc(num(edge.volume_shares))}</td><td class="num">${esc(pct(edge.share_of_internal_pct))}</td><td class="num">${esc(num(edge.vwap,2))}</td></tr>`);
      const priceRows = [['Pasangan / kelompok',price.internal_first_vwap,price.internal_last_vwap,price.internal_change_pct],['Seluruh RG pada waktu yang sama',price.rg_first_vwap,price.rg_last_vwap,price.rg_change_pct]].map(row => `<tr><td>${esc(row[0])}</td><td class="num">${esc(num(row[1],2))}</td><td class="num">${esc(num(row[2],2))}</td><td class="num">${esc(pct(row[3],2))}</td></tr>`);
      const failed = (example.failed_checks || []).filter(check => !check.passed);
      const members = (example.member_flows || []).map(member => `<tr><td class="py-code">${esc(member.broker)}</td><td class="num">${esc(num(member.buy_volume_shares))}</td><td class="num">${esc(num(member.sell_volume_shares))}</td><td class="num">${esc(num(member.net_volume_shares))}</td><td class="num">${esc(pct(member.balance_pct))}</td></tr>`);
      return `<details class="py-tape-explanation-example" open><summary>${esc((example.brokers || []).join(' · '))} · ${esc(example.headline || (example.kind === 'group' ? 'Pola kelompok' : 'Pola pasangan'))}</summary>
        <p class="py-interpretation">${esc(example.interpretation || '')}</p><p class="py-table-note">Jendela ${esc(example.window?.start || '—')}–${esc(example.window?.end || '—')}. ${example.eligible ? 'Seluruh syarat heuristik terpenuhi; kandidat untuk ditinjau.' : 'Sebagian syarat heuristik belum terpenuhi.'}</p>
        <dl class="py-explanation-evidence">${(example.evidence || []).map(item => `<div><dt>${esc(item.label)}</dt><dd>${esc(displayValue(item.value,item.unit))}</dd><p>${esc(item.explanation || '')}</p></div>`).join('')}</dl>
        ${failed.length ? `<div class="py-summary-alert"><b>Syarat yang belum terpenuhi</b><ul>${failed.map(check => `<li>${esc(check.label || check.name)}: ${esc(displayValue(check.actual))}; syarat ${esc(displayValue(check.required))}.</li>`).join('')}</ul></div>` : ''}
        <details><summary>Siapa menjual kepada siapa pada print yang terlihat?</summary><p class="py-table-note">Arah panah: broker penjual → broker pembeli. Ini hubungan pada transaksi yang tersedia, bukan bukti rekening atau pemilik yang sama.</p>${table(['Penjual → pembeli','Print','Jumlah (lembar)','Pangsa internal','VWAP'],edges,'Hubungan per transaksi belum tersedia.')}</details>
        <details><summary>Bandingkan harga pada waktu yang sama</summary><p class="py-table-note">${esc(price.first_time || '—')} → ${esc(price.last_time || '—')}. Harga adalah VWAP per timestamp; urutan print dalam detik yang sama tidak ditebak. Pembanding seluruh RG juga mencakup transaksi pasangan/kelompok ini.</p>${table(['Cakupan','VWAP awal','VWAP akhir','Perubahan'],priceRows)}<p class="py-table-note">Harga naik bersamaan dengan aktivitas kelompok belum membuktikan bahwa kelompok menyebabkan kenaikan.</p></details>
        ${members.length ? `<details><summary>Arus internal tiap broker pada jendela ini</summary><p class="py-table-note">Hanya transaksi antarsesama anggota pada jendela ini; arus terhadap broker di luar kelompok tidak termasuk.</p>${table(['Broker','Beli internal (lembar)','Jual internal (lembar)','Net internal (lembar)','Keseimbangan'],members)}</details>` : ''}
        ${(example.limitations || []).length ? `<details><summary>Batas interpretasi contoh ini</summary><ul class="py-warning-list">${example.limitations.map(item => `<li>${esc(item)}</li>`).join('')}</ul></details>` : ''}
      </details>`;
    }).join('');
    return `<section class="py-tape-explanation" aria-label="Penjelasan bukti crossing"><div class="py-inline py-between"><h3>${esc(report.title || 'Apa yang dapat disimpulkan dari tape?')}</h3><span class="py-summary-level">Bukti: transaksi yang disuplai</span></div><p class="py-interpretation">${esc(report.summary || '')}</p>
      <div class="py-inline py-pair-meta"><span>${esc(num(coverage.regular_trade_count))} print RG</span><span>Cakupan dua kode broker ${esc(pct(coverage.known_counterparty_volume_pct))}</span><span>Broker beli = jual ${esc(pct(coverage.same_broker_rg_volume_pct))} dari volume RG</span></div>
      ${coverage.group_search_limited ? '<p class="py-table-note">Pencarian kelompok memakai batas cakupan; hasil ini tidak mencakup seluruh kombinasi broker.</p>' : ''}${examples}
      ${(report.limitations || []).length ? `<details><summary>Batas kesimpulan keseluruhan</summary><ul class="py-warning-list">${report.limitations.map(item => `<li>${esc(item)}</li>`).join('')}</ul></details>` : ''}
      <p class="py-table-note">Contoh pasangan dan kelompok dapat memakai print yang sama. Jumlah kandidat bukan jumlah kejadian independen; skor adalah alat prioritas pemeriksaan, bukan probabilitas manipulasi.</p></section>`;
  }

  function renderTape(tape) {
    if (!tape) return `<div class="card mt"><h2>Running trade</h2><p class="py-interpretation">Belum ada tape. Tambahkan running trade untuk memeriksa kandidat transaksi broker yang sama dan perdagangan di papan non-reguler.</p></div>`;
    const summary = tape.summary || {}, coverage = tape.coverage || {}, same = tape.same_broker || {}, nonRegular = tape.non_regular || {};
    const sampleRows = (same.samples || []).slice(0,20).map(trade => `<tr><td>${esc(trade.time)}</td><td class="num">${esc(trade.buyer || '—')}</td><td class="num">${esc(trade.seller || '—')}</td><td class="num">${esc(trade.board || 'UNKNOWN')}</td><td class="num">${esc(num(trade.price,2))}</td><td class="num">${esc(num(trade.lot,2))}</td><td class="num">${esc(compact(trade.value))}</td></tr>`);
    const pairs = (tape.regular_pair_candidates || []).slice(0,8).map(pair => `<div class="py-pair-line"><span>${esc(pair.broker_a)} ↔ ${esc(pair.broker_b)}${pair.reciprocal ? ' · dua arah' : ''}</span><span>${esc(num(pair.count))} transaksi · ${esc(compact(pair.value))} Rp</span></div>`).join('');
    const ngRows = (nonRegular.samples || []).slice(0,20).map(trade => `<tr><td>${esc(trade.time)}</td><td class="num">${esc(trade.buyer || '—')}</td><td class="num">${esc(trade.seller || '—')}</td><td class="num">${esc(trade.board || 'UNKNOWN')}</td><td class="num">${esc(num(trade.lot,2))}</td><td class="num">${esc(compact(trade.value))}</td></tr>`);
    return `<div class="card mt"><h2>Running trade · kandidat, bukan kepastian crossing</h2>
      ${renderTapeExplanation(tape.explanation_report)}
      <div class="py-stat-grid">
        ${stat('Transaksi valid',num(summary.trade_count),`${num(summary.invalid_row_count || 0)} baris tidak valid · ${num(summary.duplicate_id_count || 0)} ID duplikat`)}
        ${stat('Cakupan dua kode broker',pct(coverage.both_pct),'Transaksi dengan buyer dan seller yang diketahui')}
        ${stat('Broker beli = jual',num(same.count || 0),`${num(same.lot || 0,2)} lot · Rp ${compact(same.value || 0)}`)}
        ${stat('Papan non-reguler',num(nonRegular.count || 0),`NG ${num(tape.negotiated?.count || 0)} · TN ${num(tape.cash?.count || 0)} · Rp ${compact(nonRegular.value || 0)}`)}
      </div>
      ${renderTapePrice(tape.trades || [])}
      <div class="py-tape-info">Kesamaan kode broker tidak membuktikan kesamaan pemilik, crossing yang disengaja, atau wash trading. Net flow tape hanya memakai transaksi RG dengan kedua broker diketahui dan berbeda; tape adalah sampel sesi yang Anda berikan.</div>
      ${(tape.warnings || []).length ? `<ul class="py-warning-list">${tape.warnings.map(warning => `<li>${esc(warning)}</li>`).join('')}</ul>` : ''}
      <details><summary>Kandidat broker beli = broker jual · contoh transaksi</summary>${table(['Waktu','Buyer','Seller','Papan','Harga','Lot','Nilai (Rp)'],sampleRows,'Tidak ada kandidat broker yang sama pada tape ini.')}</details>
      <details><summary>Negosiasi / tunai · dipisahkan dari arus reguler</summary>${table(['Waktu','Buyer','Seller','Papan','Lot','Nilai (Rp)'],ngRows,'Tidak ada transaksi non-reguler yang teridentifikasi.')}<p class="py-table-note">Papan tidak diketahui tidak dianggap sebagai papan reguler. Baris yang broker-nya sama dapat juga berada pada papan non-reguler; kedua kelompok dapat beririsan.</p></details>
      ${pairs ? `<details><summary>Pasangan broker reguler yang menonjol</summary>${pairs}<p class="py-table-note">Hubungan pasangan bersifat deskriptif; pertukaran dua arah tidak membuktikan koordinasi.</p></details>` : ''}
      ${(tape.invalid_rows || []).length ? `<details><summary>Baris tape yang tidak valid</summary><ul class="py-warning-list">${tape.invalid_rows.map(row => `<li>Baris ${esc(row.line)}: ${esc(row.error)}</li>`).join('')}</ul></details>` : ''}
      ${renderPairSurveillance(tape.pair_price_surveillance)}
      ${renderGroupSurveillance(tape.group_price_surveillance)}
    </div>`;
  }

  function renderTapePrice(trades) {
    const buckets = new Map();
    let low = Infinity, high = -Infinity, firstTime = Infinity, lastTime = -Infinity;
    let firstValue = 0, firstVolume = 0, lastValue = 0, lastVolume = 0;
    for (const trade of trades) {
      if (trade.board !== 'RG') continue;
      const t = Number(trade.t), p = Number(trade.price), v = Number(trade.volume_shares);
      if (![t,p,v].every(Number.isFinite) || v <= 0) continue;
      const minute = Math.floor(t / 60), bucket = buckets.get(minute) || {minute,value:0,volume:0};
      bucket.value += p*v; bucket.volume += v; buckets.set(minute,bucket);
      low = Math.min(low,p); high = Math.max(high,p);
      if (t < firstTime) { firstTime=t; firstValue=0; firstVolume=0; }
      if (t === firstTime) { firstValue+=p*v; firstVolume+=v; }
      if (t > lastTime) { lastTime=t; lastValue=0; lastVolume=0; }
      if (t === lastTime) { lastValue+=p*v; lastVolume+=v; }
    }
    const points = [...buckets.values()].sort((a,b)=>a.minute-b.minute);
    if (!points.length) return '';
    const fmtTime = t => `${String(Math.floor(t/3600)).padStart(2,'0')}:${String(Math.floor(t%3600/60)).padStart(2,'0')}`;
    const start = points[0].minute, span = Math.max(1,points.at(-1).minute-start), range = Math.max(1,high-low);
    const x = minute => 48+840*(minute-start)/span, y = price => 130-100*(price-low)/range;
    const path = points.map((point,i)=>`${i===0 || point.minute-points[i-1].minute>2 ? 'M':'L'}${x(point.minute).toFixed(2)},${y(point.value/point.volume).toFixed(2)}`).join(' ');
    const first = firstValue/firstVolume, last = lastValue/lastVolume;
    return `<section class="py-tape-price"><h3>Harga sepanjang tape RG</h3><p class="py-interpretation">VWAP pada waktu pertama ${esc(num(first,2))} → terakhir ${esc(num(last,2))} (${esc(pct((last/first-1)*100,2))}); rentang seluruh print ${esc(num(low,2))}–${esc(num(high,2))}. Perubahan dalam jendela pendek dapat berbeda dari arah sesi.</p>
      <svg viewBox="0 0 920 160" role="img" aria-label="VWAP per menit sepanjang running trade"><line x1="48" y1="130" x2="888" y2="130" stroke="var(--border)"/><line x1="48" y1="30" x2="888" y2="30" stroke="var(--border)"/><text x="4" y="34" fill="var(--muted)" font-size="11">${esc(num(high,2))}</text><text x="4" y="134" fill="var(--muted)" font-size="11">${esc(num(low,2))}</text><path d="${path}" fill="none" stroke="var(--blue)" stroke-width="2"/>${points.map(point=>`<circle cx="${x(point.minute).toFixed(2)}" cy="${y(point.value/point.volume).toFixed(2)}" r="1.5" fill="var(--blue)"><title>${fmtTime(point.minute*60)} · VWAP ${num(point.value/point.volume,2)}</title></circle>`).join('')}<text x="48" y="154" fill="var(--muted)" font-size="11">${fmtTime(firstTime)}</text><text x="888" y="154" text-anchor="end" fill="var(--muted)" font-size="11">${fmtTime(lastTime)}</text></svg>
      <p class="py-table-note">Grafik memakai VWAP per menit yang memiliki transaksi; celah lebih dari dua menit tidak disambungkan. Bukan grafik OHLC resmi.</p></section>`;
  }

  function renderPairSurveillance(report) {
    if (!report) return '';
    const pairs = report.candidates || [], coverage = report.coverage || {}, config = report.config || {};
    const eligibleCount = pairs.filter(pair => pair.eligibility?.eligible).length;
    const names = {reciprocity:'Volume dua arah',dominance:'Pangsa volume RG',dependence:'Ketergantungan kedua broker',alternation:'Pergantian buyer/seller',price:'Kenaikan VWAP pasangan'};
    const label = pair => pair.eligibility?.eligible ? (pair.score >= (config.high_score_min || 70) ? 'Prioritas tinjau tinggi' : 'Kandidat untuk ditinjau') : 'Ambang belum terpenuhi';
    const rows = pairs.map(pair => `<tr><td class="py-code">${esc(pair.broker_a)} ↔ ${esc(pair.broker_b)}</td><td class="num">${esc(pair.window?.start)}–${esc(pair.window?.end)}</td><td class="num">${esc(num(pair.count))}</td><td class="num">${esc(pct(pair.volume_share_pct))}</td><td class="num">${esc(pct(pair.reciprocity_pct))}</td><td class="num">${esc(pct(pair.price_change_pct,2))}</td><td class="num">${esc(pct(pair.alternation_pct))}</td><td class="num">${pair.score == null ? 'N/A' : esc(num(pair.score,1))}</td><td><span class="py-pair-tag${pair.eligibility?.eligible ? ' py-pair-flag' : ''}">${esc(label(pair))}</span></td></tr>`);
    const details = pairs.map(pair => {
      const checks = (pair.eligibility?.checks || []).map(check => `<li>${check.passed ? '✓' : '○'} ${esc(check.name)}: ${esc(check.actual == null ? 'tidak tersedia' : typeof check.actual === 'number' ? num(check.actual,2) : check.actual)} · syarat ${esc(typeof check.required === 'number' ? num(check.required,2) : check.required)}</li>`).join('');
      const components = (pair.components || []).map(component => `<tr><td>${esc(names[component.name] || component.name)}</td><td class="num">${esc(num(component.weight))}%</td><td class="num">${component.available ? esc(num(component.score,1)) : 'N/A'}</td></tr>`);
      return `<details class="py-pair-detail"><summary>${esc(pair.broker_a)} ↔ ${esc(pair.broker_b)} · bukti &amp; syarat</summary>
        <p class="py-interpretation">${esc(pair.window?.start)}–${esc(pair.window?.end)} · ${esc(num(pair.distinct_timestamps))} waktu berbeda. Pangsa pasangan pada aktivitas ${esc(pair.broker_a)}: ${esc(pct(pair.dependence_a_pct))}; pada ${esc(pair.broker_b)}: ${esc(pct(pair.dependence_b_pct))}. Volume RG lain atau tanpa identitas lengkap: ${esc(pct(pair.context?.nonpair_volume_share_pct))}; sebagian dapat berasal dari pasangan ini.</p>
        ${table(['Komponen','Bobot','Nilai 0–100'],components)}
        <ul class="py-warning-list">${checks}</ul>
        <ul class="py-warning-list">${(pair.evidence || []).map(item=>`<li>${esc(item)}</li>`).join('')}</ul>
        <p class="py-table-note">${(pair.limitations || []).map(esc).join(' ')}</p>
      </details>`;
    }).join('');
    return `<section class="py-pair-surveillance" aria-label="Pola dua broker dan harga naik"><h3>Pola dua broker &amp; harga naik</h3>
      <p class="py-interpretation">${report.status === 'no_regular_trades' ? 'Belum ada transaksi yang ditandai RG. Label papan dan kode broker diperlukan untuk pemeriksaan ini.' : eligibleCount ? `${num(eligibleCount)} pasangan memenuhi semua syarat pada jendela yang ditampilkan.` : 'Tidak ada jendela yang memenuhi semua syarat pada tape ini.'} Yang dicari adalah perdagangan dua arah yang berulang bersamaan dengan kenaikan harga; ini bukan bukti bahwa pasangan tersebut menyebabkan kenaikan.</p>
      <div class="py-inline py-pair-meta"><span>Jendela ${esc(num((config.window_seconds || 300)/60,1))} menit</span><span>Cakupan kode pasangan ${esc(pct(coverage.known_pair_volume_pct))} dari volume RG</span><span>${esc(num(coverage.evaluated_windows))} jendela diperiksa</span></div>
      ${table(['Pasangan','Waktu','Print','Pangsa RG','Dua arah','Δ VWAP','Alternasi','Skor','Hasil'],rows,'Data pasangan belum cukup untuk membentuk jendela yang bisa dinilai.')}
      <p class="py-table-note">Skor adalah prioritas pemeriksaan, bukan probabilitas manipulasi. Penilaian mensyaratkan ≥${esc(num(config.min_pair_prints || 6))} print, ≥${esc(num(config.min_distinct_timestamps || 3))} waktu berbeda, ≥${esc(num(config.min_prints_each_direction || 2))} print tiap arah, kenaikan VWAP ≥${esc(pct(config.min_price_rise_pct ?? .5))}, volume dua arah ≥${esc(pct(config.min_reciprocity_pct ?? 60))}, pangsa RG ≥${esc(pct(config.min_volume_share_pct ?? 25))}, serta ≥${esc(num(config.min_comparable_direction_transitions || 2))} transisi arah yang dapat dibandingkan dengan alternasi ≥${esc(pct(config.min_alternation_pct ?? 50))}. Hanya jendela terkuat per pasangan ditampilkan; hasil tidak dijumlahkan menjadi jumlah kejadian.</p>
      ${details}
      <details><summary>Metode &amp; batas deteksi</summary><ul class="py-warning-list">${(report.warnings || []).map(warning=>`<li>${esc(warning)}</li>`).join('')}</ul><p class="py-interpretation">Transaksi pada waktu yang sama dikelompokkan, sehingga urutan yang tidak tersedia tidak ditebak. Pasangan dihitung terhadap seluruh volume RG yang disuplai, termasuk transaksi yang kode broker-nya tidak lengkap. Tape yang telah difilter untuk dua broker akan membuat pangsa tampak tinggi: gunakan seluruh transaksi saham pada sesi yang sama. Broker summary harian tidak memiliki pasangan lawan transaksi maupun urutan waktu ini.</p></details>
    </section>`;
  }

  function renderGroupSurveillance(report) {
    if (!report) return '';
    const groups = report.candidates || [], coverage = report.coverage || {};
    const qualified = groups.filter(group => group.eligibility?.eligible).length;
    const rows = groups.map(group => `<tr><td class="py-code">${esc((group.brokers || []).join(' · '))}</td><td class="num">${esc(group.window?.start)}–${esc(group.window?.end)}</td><td class="num">${esc(num(group.count))}</td><td class="num">${esc(pct(group.volume_share_pct))}</td><td class="num">${esc(pct(group.balance_pct))}</td><td class="num">${esc(pct(group.price_change_pct,2))}</td><td class="num">${esc(pct(group.rg_price_change_pct,2))}</td><td class="num">${group.score == null ? 'N/A' : esc(num(group.score,1))}</td><td><span class="py-pair-tag${group.eligibility?.eligible ? ' py-pair-flag' : ''}">${group.eligibility?.eligible ? 'Kandidat untuk ditinjau' : 'Ambang belum terpenuhi'}</span></td></tr>`);
    const details = groups.map(group => {
      const members = (group.member_flows || []).map(member => `<tr><td class="py-code">${esc(member.broker)}</td><td class="num">${esc(num(member.buy_volume_shares))}</td><td class="num">${esc(num(member.sell_volume_shares))}</td><td class="num">${esc(num(member.net_volume_shares))}</td><td class="num">${esc(pct(member.participation_pct))}</td><td class="num">${esc(pct(member.balance_pct))}</td><td class="num">${esc(pct(member.dependence_pct))}</td></tr>`);
      const checks = (group.eligibility?.checks || []).map(check => `<li>${check.passed ? '✓' : '○'} ${esc(check.name)}: ${esc(typeof check.actual === 'number' ? num(check.actual,2) : check.actual == null ? 'tidak tersedia' : check.actual)} · syarat ${esc(check.required)}</li>`).join('');
      return `<details class="py-pair-detail"><summary>${esc((group.brokers || []).join(' · '))} · arus tiap anggota &amp; bukti</summary>
        <p class="py-interpretation">${esc(group.window?.first_group_timestamp)}–${esc(group.window?.end)} · ${esc(num(group.distinct_timestamps))} waktu berbeda. Keseimbangan memakai jumlah nilai absolut net tiap broker; net total kelompok tidak digunakan karena selalu nol untuk transaksi internal.</p>
        ${table(['Broker','Beli internal (lembar)','Jual internal (lembar)','Net internal (lembar)','Partisipasi internal','Keseimbangan','Ketergantungan'],members)}
        <ul class="py-warning-list">${checks}</ul><ul class="py-warning-list">${(group.evidence || []).map(item=>`<li>${esc(item)}</li>`).join('')}</ul>
        <p class="py-table-note">${(group.limitations || []).map(esc).join(' ')}</p>
      </details>`;
    }).join('');
    return `<section class="py-pair-surveillance" aria-label="Pola kelompok tiga sampai empat broker"><h3>Pola kelompok 3–4 broker</h3>
      <p class="py-interpretation">${esc(num(qualified))} kelompok memenuhi syarat pada hasil yang ditampilkan. Pemeriksaan mencari arus internal yang membentuk siklus, keterlibatan berarti dari setiap anggota, dan kenaikan harga pada jendela yang sama. Ini menunjukkan pola untuk ditinjau, bukan identitas pemilik atau bukti koordinasi.</p>
      <div class="py-inline py-pair-meta"><span>${esc(num(coverage.searched_groups))} dari ${esc(num(coverage.discovered_groups))} kelompok yang ditemukan diperiksa</span><span>${esc(num(coverage.evaluated_windows))} jendela</span><span>${esc(num(coverage.excluded_broker_count))} broker di luar pencarian kelompok</span></div>
      <p class="py-tape-info">Cakupan pencarian: ${esc((coverage.pool_brokers || []).join(', ') || 'belum ada broker')}. ${coverage.search_exhaustive_within_uploaded_tape ? 'Seluruh kelompok yang memenuhi kriteria awal pada tape ini dicakup.' : 'Pencarian dibatasi pada broker paling aktif dan kelompok terpilih; kelompok lain dapat terlewat.'} ${esc(num(coverage.groups_omitted_by_cap || 0))} kelompok dilewati oleh batas pencarian. Penyebut pangsa tetap memakai seluruh volume RG yang diunggah.</p>
      ${table(['Kelompok','Jendela','Print','Pangsa RG','Keseimbangan','Δ VWAP grup','Δ VWAP RG','Skor','Hasil'],rows,'Belum ada kelompok dengan hubungan internal yang dapat diperiksa.')}
      <p class="py-table-note">Pengaturan awal: ≥9 print untuk 3 broker / ≥12 untuk 4; ≥3 waktu berbeda; tiap anggota ≥2 beli dan ≥2 jual, partisipasi ≥20% dan keseimbangan ≥40%; siklus memakai hubungan ≥1% volume internal; keseimbangan grup ≥60%, pangsa RG ≥25%, VWAP grup naik ≥0,5%, serta VWAP seluruh RG naik pada waktu awal/akhir yang sama. Angka ini heuristik yang belum dikalibrasi. Kelompok tumpang tindih tidak boleh dijumlahkan sebagai kejadian terpisah.</p>
      ${details}<details><summary>Metode &amp; batas pencarian kelompok</summary><ul class="py-warning-list">${(report.warnings || []).map(item=>`<li>${esc(item)}</li>`).join('')}</ul></details>
    </section>`;
  }

  function renderResult() {
    const result = state.result;
    const period = result.period || {}, concentration = result.concentration || {}, score = result.score || {}, brokers = result.brokers || [];
    const lead = brokers.find(broker => broker.net_value > 0);
    const evidence = (score.components || []).map(component => `<div class="py-evidence">
      <div>${esc(componentLabels[component.name] || component.name)} <span class="hint">${esc(num(component.weight))}%</span></div>
      <div class="py-track"><span style="width:${component.available ? fractionWidth(component.score) : 0}%;${component.available ? '' : 'background:var(--muted)'}"></span></div>
      <div class="py-evidence-value">${component.available ? esc(num(component.score,1)) : 'N/A'}</div>
      <div class="py-evidence-note">Bobot aktif ${esc(num(component.effective_weight ?? (component.available ? component.weight : 0), 1))}% dari ${esc(num(component.weight))}%. ${esc(component.evidence || (component.available ? '' : 'Data belum tersedia.'))}</div></div>`).join('');
    const dailyRows = (result.daily || []).map(day => `<tr><td>${esc(day.date)}</td><td class="num">${esc(compact(day.buy_value))}</td><td class="num">${esc(compact(day.sell_value))}</td><td class="num">${esc(compact(day.positive_net_value))}</td><td class="num ${signedClass(day.leader_net_value)}">${esc(compact(day.leader_net_value))}</td></tr>`);
    const sources = (result.sources || []).map(source => `<tr><td>${esc(source.name)}</td><td class="num">${esc(source.ticker)}</td><td class="num">${esc(source.start)} → ${esc(source.end)}</td><td class="num">${esc(source.board || '—')}</td><td class="num">${esc(num(source.rows))}</td><td class="num">${esc(source.kind)}</td></tr>`);
    byId('py-empty').hidden = true;
    byId('py-results').hidden = false;
    byId('py-results').innerHTML = `
      <div class="py-stale" id="py-stale" hidden>Input berubah. Hasil di bawah berasal dari analisis sebelumnya; jalankan ulang untuk memperbarui.</div>
      <div class="py-results-head"><div><h2>${esc(result.ticker)} <span style="font-weight:400">· Ringkasan akumulasi</span></h2><p>${esc(period.start || '—')} — ${esc(period.end || '—')} · ${esc(num(period.observed_days || 0))} hari teramati · ${esc(num(brokers.length))} broker</p></div><div class="py-inline"><button class="btn small" id="py-export-csv" type="button">Ekspor broker CSV</button><button class="btn small" id="py-export-json" type="button">Ekspor analisis JSON</button></div></div>
      <div class="py-stat-grid">
        ${stat('Skor bukti akumulasi',score.value == null ? 'Belum cukup' : `${num(score.value,1)} / 100`,score.label || 'Skor heuristik', 'py-score-value')}
        ${stat('Cakupan bukti',pct(score.coverage_pct,0),'Bobot tersedia dari seluruh komponen penilaian')}
        ${stat('Top-3 net buyer',pct(concentration.top3_positive_net_pct),'Pangsa dari total net buying positif')}
        ${stat('Net buyer terbesar',lead?.code || '—',lead ? `Rp ${compact(lead.net_value)} · ${num(lead.net_buy_days)} / ${num(lead.observed_days)} hari net beli` : 'Tidak ada broker dengan net value positif')}
      </div>
      <div class="py-result-grid">
        <div class="card"><h2>Komponen skor &amp; bukti</h2><p class="py-interpretation">${esc(score.interpretation || 'Nilai komponen 0–100; data tidak tersedia tidak dianggap sebagai sinyal netral.')}</p>${evidence}</div>
        <div class="card"><h2>Kualitas data &amp; interpretasi</h2><p class="py-interpretation">HHI net buying positif: <b>${esc(num(concentration.hhi_positive_net,3))}</b>. Net buying positif / gross buy: <b>${esc(pct(concentration.positive_net_to_gross_buy_pct))}</b>.</p>
          <p class="py-interpretation">${esc(num(period.observed_days || 0))} hari berbeda mendukung analisis konsistensi. ${esc(num(period.period_exports || 0))} ekspor rentang tanggal dihitung pada total, tetapi tidak dianggap sebagai observasi harian.</p>
          <ul class="py-warning-list">${(result.warnings || []).length ? result.warnings.map(warning => `<li>${esc(warning)}</li>`).join('') : '<li>Tidak ada peringatan validasi dari data yang diproses.</li>'}</ul>
          <p class="py-table-note">Total net buy seluruh broker bukan aliran dana masuk pasar: setiap transaksi memiliki sisi pembeli dan penjual. Ketidakseimbangan dapat mencerminkan cakupan ekspor yang tidak lengkap.</p>
        </div>
      </div>
      ${renderSummarySurveillance(result.summary_surveillance)}
      <div class="card mt"><div class="py-inline py-between"><h2>Broker · net flow dan harga beli</h2><input type="text" id="py-broker-filter" class="py-broker-filter" placeholder="Cari kode broker" aria-label="Cari kode broker" autocomplete="off"></div><div id="py-brokers"></div><p class="py-table-note">Diurutkan berdasarkan net value. Rp: M = miliar, jt = juta. VWAP memakai nilai bruto / lembar bruto. Hari teramati adalah hari yang tersedia pada data; tidak menyatakan seluruh sesi pasar telah tercakup. Ekspor CSV berisi nilai penuh.</p></div>
      <div class="card mt"><h2>Ringkasan hari teramati</h2>${table(['Tanggal','Gross buy (Rp)','Gross sell (Rp)','Total net positif (Rp)','Net kelompok dominan (Rp)'],dailyRows,'Ekspor rentang tanggal tidak dapat membuktikan konsistensi harian.')}<p class="py-table-note">Total net positif adalah jumlah net value broker yang positif pada hari itu. Kelompok dominan ditetapkan oleh engine dari broker teratas pada periode analisis.</p></div>
      ${renderTape(result.tape)}
      <details class="card mt"><summary>File yang digunakan &amp; rentang tanggal</summary>${table(['File','Saham','Tanggal','Papan','Baris','Jenis'],sources)}</details>`;
    renderBrokerTable();
    bindSummarySurveillance();
    byId('py-broker-filter').addEventListener('input', renderBrokerTable);
    byId('py-export-json').addEventListener('click', exportJson);
    byId('py-export-csv').addEventListener('click', exportCsv);
  }

  function download(data, type, suffix, source = state.result, kind = 'akumulasi') {
    const safeTicker = String(source.ticker || 'IDX').replace(/[^A-Za-z0-9_-]/g, '_');
    const end = String(source.period?.end || '').replace(/[^0-9-]/g, '');
    const blob = new Blob([data], {type});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeTicker}_${end}_${kind}.${suffix}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportJson() {
    if (!state.result || state.stale) return;
    download(JSON.stringify(state.result, null, 2), 'application/json;charset=utf-8', 'json');
  }

  function csvCell(value) {
    let text = String(value ?? '');
    // Prevent spreadsheet formula execution for imported text. Numeric negative
    // amounts remain numbers; broker/source strings starting with formulas do not.
    if (typeof value !== 'number' && /^[\s\uFEFF]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    if (!state.result || state.stale) return;
    const keys = ['code','buy_value','sell_value','net_value','buy_lot','sell_lot','net_lot','buy_shares','sell_shares','net_shares','avg_buy_price','avg_sell_price','net_buy_days','observed_days','consistency_pct','positive_net_share_pct'];
    const rows = [['ticker','period_start','period_end',...keys], ...(state.result.brokers || []).map(broker => [state.result.ticker,state.result.period?.start,state.result.period?.end,...keys.map(key => broker[key])])];
    download('\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8', 'csv');
  }

  // A failed health check only updates connectivity; users can still select files.
  api('/api/samples').then(response => { state.samples = response.files || []; }).catch(() => {
    byId('py-engine').textContent = 'Python lokal · belum terhubung';
    status('Jalankan python app.py lalu buka http://127.0.0.1:8765 untuk memakai analisis Python.');
  });
})();

