const waitlist = document.querySelector('[data-waitlist]');
if (waitlist) {
  const button = waitlist.querySelector('button');
  const message = waitlist.querySelector('[data-form-message]');
  const email = waitlist.querySelector('input[type="email"]');
  const role = waitlist.querySelector('[name="role"]');
  const consent = waitlist.querySelector('[name="consent"]');
  const setMessage = (text, state) => {
    message.textContent = text;
    message.dataset.state = state;
    message.setAttribute('aria-live', 'polite');
  };
  waitlist.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!email?.checkValidity()) {
      email?.setAttribute('aria-invalid', 'true');
      setMessage('Masukkan alamat email yang valid.', 'error');
      window.kelolaTrack?.('waitlist_submit_error', { error: 'email_invalid' });
      email?.focus();
      return;
    }
    if (consent && !consent.checked) {
      setMessage('Centang persetujuan agar kami dapat mengirim kabar beta.', 'error');
      window.kelolaTrack?.('waitlist_submit_error', { error: 'consent_required' });
      consent.focus();
      return;
    }
    email?.removeAttribute('aria-invalid');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    setMessage('Menyimpan alamat email...', 'pending');
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email: email.value.trim(), role: role?.value || 'UMKM', consent: Boolean(consent?.checked) })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.kelolaTrack?.('waitlist_submit_error', { error: result.error || 'request_failed' });
        if (result.error === 'email_invalid') setMessage('Masukkan alamat email yang valid.', 'error');
        else if (result.error === 'rate_limited') setMessage('Terlalu banyak percobaan. Coba lagi sebentar lagi.', 'error');
        else setMessage('Belum tersimpan. Coba lagi atau hubungi kami lewat WhatsApp.', 'error');
        return;
      }
      waitlist.reset();
      window.kelolaTrack?.('waitlist_submit_success', { role: role?.value || 'UMKM', duplicate: Boolean(result.duplicate) });
      setMessage(result.duplicate ? 'Email ini sudah ada di daftar tunggu.' : 'Terima kasih. Kami simpan alamatmu untuk kabar beta berikutnya.', 'success');
    } catch {
      window.kelolaTrack?.('waitlist_submit_error', { error: 'network_error' });
      setMessage('Belum tersambung. Coba lagi atau hubungi kami lewat WhatsApp.', 'error');
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });
}

const menu = document.querySelector('[data-menu]');
const nav = document.querySelector('[data-nav]');
if (menu && nav) {
  menu.setAttribute('aria-expanded', 'false');
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });
}

document.querySelectorAll('[data-engagement-form]').forEach((form) => form.addEventListener('submit', (event) => {
  event.preventDefault();
  const followers = Number(form.followers.value || 0);
  const likes = Number(form.likes.value || 0);
  const comments = Number(form.comments.value || 0);
  const saves = Number(form.saves.value || 0);
  const shares = Number(form.shares.value || 0);
  const reach = Number(form.reach.value || followers || 1);
  const rate = ((likes + comments + saves + shares) / Math.max(reach, 1) * 100).toFixed(2);
  const result = form.parentElement?.querySelector('[data-tool-result]');
  if (!result) return;
  result.replaceChildren();
  const strong = document.createElement('strong');
  strong.textContent = `${rate}%`;
  const text = document.createElement('span');
  text.textContent = 'Rasio ini adalah interaksi dibagi jangkauan. Gunakan sebagai titik awal, lalu bandingkan per format dan periode.';
  result.append(strong, document.createElement('br'), text);
}));

document.querySelectorAll('[data-calendar-form]').forEach((form) => form.addEventListener('submit', (event) => {
  event.preventDefault();
  const month = form.month.value;
  const goal = form.goal.value;
  const formats = ['Edukasi', 'Bukti proses', 'Penawaran', 'Cerita pelanggan', 'Di balik layar', 'Tanya jawab', 'Repurpose'];
  const result = form.parentElement?.querySelector('[data-tool-result]');
  if (!result) return;
  result.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = `Rencana ${month}`;
  result.append(title, document.createElement('br'));
  formats.forEach((item, index) => {
    const line = document.createElement('span');
    line.textContent = `${index + 1}. ${item} untuk ${goal}`;
    result.append(line);
    if (index < formats.length - 1) result.append(document.createElement('br'));
  });
  const copyButton = form.parentElement?.querySelector('[data-copy-calendar]');
  if (copyButton) copyButton.dataset.copyText = Array.from(result.querySelectorAll('span')).map((line) => line.textContent).join('\n');
}));

document.querySelectorAll('[data-copy-calendar]').forEach((button) => button.addEventListener('click', async () => {
  const text = button.dataset.copyText || button.closest('.tool-grid')?.querySelector('[data-tool-result]')?.innerText || '';
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Tersalin';
    setTimeout(() => { button.textContent = 'Salin kerangka'; }, 1800);
  } catch {
    button.textContent = 'Salin gagal, pilih teks manual';
  }
}));
