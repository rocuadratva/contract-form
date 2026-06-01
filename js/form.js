const WEBHOOK_URL = 'https://n8n.srv1326537.hstgr.cloud/webhook/contract-execution';
const OPTIONS_URL = 'https://n8n.srv1326537.hstgr.cloud/webhook/contract-form-options';

let allUnits = {};

const REQUIRED_FIELDS = [
  'full_name', 'email', 'phone',
  'property_name', 'unit_number',
  'original_contract_date', 'lease_term',
  'emergency_name', 'emergency_phone'
];

const ERROR_MESSAGES = {
  full_name: 'Full name is required.',
  email: 'A valid email address is required.',
  phone: 'Phone number is required.',
  property_name: 'Please select a property.',
  unit_number: 'Please select a unit.',
  original_contract_date: 'Original contract date is required.',
  lease_term: 'Please select a lease term.',
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

  if (!valid) {
    errEl.textContent = ERROR_MESSAGES[name] || 'This field is required.';
  }

  field.classList.toggle('error', !valid);
  errEl.classList.toggle('visible', !valid);
  return valid;
}

function validateAll() {
  return REQUIRED_FIELDS.map(validateField).every(Boolean);
}

function buildPayload() {
  const payload = {};
  for (const name of REQUIRED_FIELDS) {
    const field = getField(name);
    payload[name] = field ? field.value.trim() : '';
  }
  return payload;
}

function setSubmitting(btn, state) {
  btn.disabled = state;
  btn.classList.toggle('loading', state);
}

async function loadPropertyOptions() {
  const propertySelect = getField('property_name');
  const unitSelect = getField('unit_number');
  if (!propertySelect || !unitSelect) return;

  try {
    const res = await fetch(OPTIONS_URL);
    if (!res.ok) throw new Error('Failed to load options');
    const data = await res.json();
    allUnits = data.units || {};

    propertySelect.innerHTML = '<option value="">Select a property…</option>';
    for (const prop of (data.properties || [])) {
      const opt = document.createElement('option');
      opt.value = prop;
      opt.textContent = prop;
      propertySelect.appendChild(opt);
    }
  } catch {
    propertySelect.innerHTML = '<option value="">Could not load properties — refresh to try again</option>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('intake-form');
  if (!form) return;

  const submitBtn = form.querySelector('.btn-submit');
  const errorBanner = document.getElementById('error-banner');
  const propertySelect = getField('property_name');
  const unitSelect = getField('unit_number');

  loadPropertyOptions();

  const leaseTermSelect = getField('lease_term');

  function resetLeaseTermSelect() {
    leaseTermSelect.innerHTML = '<option value="">Select a unit first</option>';
    leaseTermSelect.disabled = true;
  }

  propertySelect.addEventListener('change', () => {
    const selected = propertySelect.value;
    unitSelect.innerHTML = '<option value="">Select a unit…</option>';
    const units = allUnits[selected] || [];
    for (const u of units) {
      const opt = document.createElement('option');
      opt.value = u.unit_number;
      opt.textContent = u.unit_type ? `${u.unit_number} (${u.unit_type})` : u.unit_number;
      unitSelect.appendChild(opt);
    }
    unitSelect.disabled = units.length === 0;
    resetLeaseTermSelect();
    validateField('property_name');
  });

  unitSelect.addEventListener('change', () => {
    const property = propertySelect.value;
    const unitNumber = unitSelect.value;
    const units = allUnits[property] || [];
    const unit = units.find(u => u.unit_number === unitNumber);
    const leaseTerms = unit?.lease_terms || [];
    leaseTermSelect.innerHTML = '<option value="">Select a lease term…</option>';
    for (const term of leaseTerms) {
      const opt = document.createElement('option');
      opt.value = term;
      opt.textContent = term;
      leaseTermSelect.appendChild(opt);
    }
    leaseTermSelect.disabled = leaseTerms.length === 0;
    validateField('unit_number');
  });

  REQUIRED_FIELDS.forEach(name => {
    const field = getField(name);
    if (!field) return;
    field.addEventListener('blur', () => validateField(name));
    field.addEventListener('change', () => {
      if (field.classList.contains('error')) validateField(name);
    });
    if (field.tagName !== 'SELECT') {
      field.addEventListener('input', () => {
        if (field.classList.contains('error')) validateField(name);
      });
    }
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
      const payload = buildPayload();
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status === 409) {
        const data = await response.json();
        errorBanner.textContent = data.message || 'This email is already registered. Please contact the property owner.';
        errorBanner.classList.add('visible');
        setSubmitting(submitBtn, false);
        return;
      }

      if (response.status === 400) {
        const data = await response.json();
        errorBanner.textContent = data.message || 'The selected property/unit could not be found. Please refresh and try again.';
        errorBanner.classList.add('visible');
        setSubmitting(submitBtn, false);
        return;
      }

      if (!response.ok) throw new Error(`Server error ${response.status}`);

      window.location.href = 'success.html';
    } catch (err) {
      errorBanner.textContent = 'Something went wrong. Please try again or contact the owner directly.';
      errorBanner.classList.add('visible');
      setSubmitting(submitBtn, false);
    }
  });
});
