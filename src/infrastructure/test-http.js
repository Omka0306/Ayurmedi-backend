/* Quick HTTP test to verify the local server is working */

const http = require('http');

const testLogin = () => {
  const data = JSON.stringify({
    email: 'admin@ayurmedi.com',
    password: 'Admin@2026'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  console.log('\n🧪 Testing Login API via HTTP...\n');
  console.log(`POST http://localhost:3000/auth/login`);
  console.log(`Body: ${data}\n`);

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log('Response:');
      
      try {
        const parsed = JSON.parse(responseData);
        console.log(JSON.stringify(parsed, null, 2));
        
        if (parsed.success && parsed.data && parsed.data.accessToken) {
          console.log('\n✅ SUCCESS! Login API is working correctly!');
          console.log(`✅ Access Token: ${parsed.data.accessToken.substring(0, 50)}...`);
          console.log(`✅ Token expires in: ${parsed.data.expiresIn} seconds`);
        } else {
          console.log('\n❌ Login failed - unexpected response format');
        }
      } catch (e) {
        console.log(responseData);
        console.log('\n❌ Failed to parse response');
      }
    });
  });

  req.on('error', (error) => {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nMake sure the dev server is running: npm run dev');
  });

  req.write(data);
  req.end();
};

testLogin();
