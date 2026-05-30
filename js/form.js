const WEBHOOK_URL = 'https://n8n.srv1326537.hstgr.cloud/webhook/contract-execution';

const REQUIRED_FIELDS = [
  'full_name', 'email', 'phone',
  'property_address', 'unit',
  'lease_start', 'lease_end',
  'emergency_name', 'emergency_phone'
];

const ERROR_MESSAGES = {
  full_name: 'Full name is required.',
  email: 'A valid email address is required.',
  phone: 'Phone number is required.',
  property_address: 'Property address is required.',
  unit: 'Unit / Room is required.',
  lease_start: 'Lease start date is required.',
  lease_end: 'Lease end date is required.',
  emergency_name: 'Emergency contact name is required.',
  emergency_phone: 'Emergency contact number is required.',
};

function getField(name) {
  return document.querySelector(`[name="${name}"]`);
}

function getError(name) {
  return document.getElementById(`err_${name}`);
}

function validateField(name) {
  const field = getField(name);
  const errEl = getError(name);
  if (!field || !errEl) return true;

  const value = field.value.trim();
  let valid = value.length > 0;

  if (name === 'email' && valid) {
    valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  if (name === 'lease_end' && valid) {
    const start = getField('lease_start').value;
    if (start && value <= start) {
      valid = false;
      errEl.textContent = 'End date must be after start date.';
    }
  }

  if (!valid && name !== 'lease_end') {
    errEl.textContent = ERROR_MESSAGES[name] || 'This field is required.';
  }

  field.classList.toggle('error', !valid);
  errEl.classList.toggle('visible', !valid);
  return valid;
}

function validateAll() {
  return REQUIRED_FIELDS.map(validateField).every(Boolean);
}

function buildPayload(form) {
  const data = new FormData(form);
  const payload = {};
  for (const name of REQUIRED_FIELDS) {
    payload[name] = (data.get(name) || '').trim();
  }
  return payload;
}

function setSubmitting(btn, state) {
  btn.disabled = state;
  btn.classList.toggle('loading', state);
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('intake-form');
  if (!form) return;

  const submitBtn = form.querySelector('.btn-submit');
  const errorBanner = document.getElementById('error-banner');

  REQUIRED_FIELDS.forEach(name => {
    const field = getField(name);
    if (!field) return;
    field.addEventListener('blur', () => validateField(name));
    field.addEventListener('input', () => {
      if (field.classList.contains('error')) validateField(name);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBanner.classList.remove('visible');

    if (!validateAll()) {
      const firstError = form.querySelector('.error');
      if (firstError) firstError.focus();
      return;
    }

    setSubmitting(submitBtn, true);

    try {
      const payload = buildPayload(form);
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Server error ${response.status}`);

      window.location.href = 'success.html';
    } catch (err) {
      errorBanner.textContent = 'Something went wrong. Please try again or contact the owner directly.';
      errorBanner.classList.add('visible');
      setSubmitting(submitBtn, false);
    }
  });
});
