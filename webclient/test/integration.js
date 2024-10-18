import { expect, use } from 'chai';
import chaiHttp from 'chai-http';
import { describe, it } from 'mocha';
import * as uuid from 'uuid';

const baseUrl = 'http://localhost:5050';

const chai = use(chaiHttp);

let drop_code = undefined;
let drop_id = undefined;
let dropper_session_token = undefined;
let receiver_session_token = undefined;

describe('droppr integration tests', () => {
  describe('POST /api/register', () => {
    it('should reject a GET request', async () => {
      const res = await chai.request.execute(baseUrl).get('/api/register');
      expect(res.status).to.equal(400);
    });

    it('should reject an empty POST request', async () => {
      const res = await chai.request.execute(baseUrl).post('/api/register');
      expect(res.status).to.equal(400);
    });

    it('should accept a POST request properly', async () => {
      const res = await chai.request.execute(baseUrl)
        .post('/api/register')
        .send([
          { label: uuid.v4(), name: "Test File 1.txt", size: 1024, type: "text/plain" },
          { label: uuid.v4(), name: "Test File 2.txt", size: 1024, type: "text/plain" },
          { label: uuid.v4(), name: "Test File 3.txt", size: 1024, type: "text/plain" },
        ]);

      // should have an OK status code
      expect(res.status).to.equal(200);

      // should contain a drop code
      drop_code = res.body.drop_code;
      expect(drop_code).to.be.a('string').that.is.not.empty;

      // should have cookies for session_token and drop_id
      const cookies = res.headers['set-cookie'];
      expect(cookies.length).to.equal(2); // two cookies
      cookies.forEach(cookie => {
        cookie = cookie.split(';');
        cookie = cookie[0].split('=');

        if (cookie[0] === 'drop_id') {
          drop_id = cookie[1];
        } else if (cookie[0] === 'session_token') {
          dropper_session_token = cookie[1];
        }
      });

      expect(dropper_session_token).to.be.a('string').that.is.not.empty;
      expect(drop_id).to.be.a('string').that.is.not.empty;
    }); // it
  }); // describe

  describe('POST /api/claim/:drop_code', () => {
    it('should reject a GET request', async () => {
      const res = await chai.request.execute(baseUrl).get('/api/claim/' + drop_code);
      expect(res.status).to.equal(400);
    });

    it('should accept a POST request properly', async () => {
      const res = await chai.request.execute(baseUrl).post('/api/claim/' + drop_code);
      expect(res.status).to.equal(200); // should have an OK status code

      // should contain fileinfo for three files
      expect(res.body).to.be.an('object');
      expect(res.body.fileinfo).to.be.an('array');
      expect(res.body.fileinfo.length).to.equal(3);
      res.body.fileinfo.forEach(file => {
        expect(file)
          .to.be.an('object')
          .and.to.have.all.keys('label', 'name', 'size', 'type');
      });

      // should have cookies for session_token and drop_id
      const cookies = res.headers['set-cookie'];
      expect(cookies.length).to.equal(2); // two cookies
      cookies.forEach(cookie => {
        cookie = cookie.split(';');
        cookie = cookie[0].split('=');

        if (cookie[0] === 'drop_id') {
          drop_id = cookie[1];
        } else if (cookie[0] === 'session_token') {
          receiver_session_token = cookie[1];
        }
      });

      expect(receiver_session_token).to.be.a('string').that.is.not.empty;
      expect(drop_id).to.be.a('string').that.is.not.empty;
    }); // it

    it('should reject a POST request when busy', async () => {
      const res = await chai.request.execute(baseUrl).post('/api/claim/' + drop_code);
      expect(res.status).to.equal(409); // conflict status code
    });
  }); // describe

  describe('POST /api/cleanup', () => {
    it('should reject a GET request', async () => {
      const res = await chai.request.execute(baseUrl).get('/api/cleanup');
      expect(res.status).to.equal(400);
    });

    it('should accept a POST request properly', async () => {
      const reqCookies = `session_token=${dropper_session_token}; drop_id=${drop_id}`;
      const res = await chai.request.execute(baseUrl)
        .post('/api/cleanup')
        .set('Cookie', reqCookies);
      expect(res.status).to.equal(200); // should have an OK status code

      // should have cookies for session_token and drop_id
      const cookies = res.headers['set-cookie'];
      expect(cookies.length).to.equal(2); // two cookies
      cookies.forEach(cookie => {
        cookie = cookie.split(';');
        cookie = cookie[0].split('=');

        if (cookie[0] === 'drop_id') {
          drop_id = cookie[1];
        } else if (cookie[0] === 'session_token') {
          dropper_session_token = cookie[1]; // overwrite dropper_session_token
        }
      });

      // expect these cookies to be overwritten with empty strings
      expect(dropper_session_token).to.be.a('string').that.is.empty;
      expect(drop_id).to.be.a('string').that.is.empty;
    });
  });
}); // describe