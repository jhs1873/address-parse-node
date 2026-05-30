import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import smart from 'address-smart-parse/smart.js';
import builtinAddress from 'address-smart-parse/lib/addressCode.js';

const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);
const maxBodySize = process.env.MAX_BODY_SIZE || '256kb';

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: maxBodySize }));
app.use(express.urlencoded({ extended: false, limit: maxBodySize }));

function readInput(req) {
  if (typeof req.body === 'string') {
    return req.body;
  }

  return req.body?.text ?? req.body?.address ?? req.body?.raw ?? '';
}

function readSender(req) {
  if (typeof req.body !== 'object' || req.body === null) {
    return '';
  }

  return req.body.phone
    ?? req.body.mobile
    ?? req.body.phoneNumber
    ?? req.body.sender
    ?? req.body.senderPhone
    ?? '';
}

function extractPhone(value) {
  if (typeof value !== 'string') {
    return {};
  }

  const match = value.match(/(?:\+?86[-\s]?)?1[3-9]\d{9}/);

  if (!match) {
    return {};
  }

  const raw = match[0];
  const phone = raw.replace(/^\+?86[-\s]?/, '');

  return {
    phone,
    phonenum: raw,
    countryCode: raw.startsWith('+86') || raw.startsWith('86') ? '86' : ''
  };
}

function formatLocation(parsed) {
  return parsed.county || parsed.city || parsed.province || '';
}

function formatDetail(parsed) {
  return [parsed.street, parsed.address, parsed.zipCode]
    .filter((item) => item !== '' && item !== undefined && item !== null)
    .join('');
}

function removeEmptyValues(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== '' && item !== undefined && item !== null)
  );
}

function smartParse(input, includeStreet) {
  if (!includeStreet) {
    return smart(input);
  }

  const base = smart(input);
  const parsed = smart(input, builtinAddress);
  const zipCode = parsed.zipCode ?? base.zipCode;

  if (zipCode && typeof parsed.address === 'string') {
    parsed.address = parsed.address.replace(zipCode, '').trim();
  }

  return {
    ...base,
    ...parsed,
    ...(zipCode ? { zipCode } : {})
  };
}

function parseAddress(req, res) {
  const input = readInput(req);

  if (typeof input !== 'string' || input.trim() === '') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Body must include a non-empty string field: text, address, or raw.'
      }
    });
  }

  const includeStreet = req.body?.includeStreet !== false;
  const parsed = smartParse(input, includeStreet);
    
  const senderPhone = extractPhone(readSender(req));
  const inputPhone = extractPhone(input);
  const phoneInfo = Object.keys(senderPhone).length > 0 ? senderPhone : inputPhone;
  const data = {
    ...parsed,
    ...phoneInfo,
    location: formatLocation(parsed),
    raw: input,
    person: parsed.name,
    detail: formatDetail(parsed)
  };

  return res.json(removeEmptyValues(data));
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/parse', parseAddress);
app.post('/smAddress', parseAddress);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found.'
    }
  });
});

app.use((err, _req, res, _next) => {
  const status = err.type === 'entity.parse.failed' ? 400 : 500;

  res.status(status).json({
    success: false,
    error: {
      code: status === 400 ? 'BAD_JSON' : 'INTERNAL_ERROR',
      message: status === 400 ? 'Invalid JSON body.' : 'Unexpected server error.'
    }
  });
});

app.listen(port, () => {
  console.log(`address-parse-api listening on :${port}`);
});
