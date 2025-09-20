const https = require('https');

exports.handler = async function(event, context) {
  const ACCESS_TOKEN = process.env.FB_CAPI_ACCESS_TOKEN;
  const PIXEL_ID = process.env.FB_PIXEL_ID;

  if (!ACCESS_TOKEN || !PIXEL_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing FB_CAPI_ACCESS_TOKEN or FB_PIXEL_ID in environment variables." }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  const apiPath = `/v17.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

  const params = event.queryStringParameters || {};
  let pageUrl = params.url || "https://pavelreality.cz";

  const eventTime = Math.floor(Date.now() / 1000);
  const headers = event.headers || {};
  const clientIp = headers['x-nf-client-connection-ip'] || headers['x-forwarded-for'] || null;
  const userAgent = headers['user-agent'] || null;

  const payload = {
    data: [
      {
        event_name: "PageView",
        event_time: eventTime,
        event_source_url: pageUrl,
        action_source: "website",
        user_data: {
          client_ip_address: clientIp,
          client_user_agent: userAgent
        }
      }
    ]
  };

  const postData = JSON.stringify(payload);

  const options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: apiPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  function doRequest() {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try { 
            const json = JSON.parse(data || '{}');
            resolve({ statusCode: res.statusCode, body: json });
          } catch(e) { resolve({ statusCode: res.statusCode, body: data }); }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    });
  }

  try {
    const resp = await doRequest();
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, meta_response: resp.body }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: String(err) }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
