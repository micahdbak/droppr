# Client

The client for droppr is a React frontend that, when built and served as static files, makes the magical file transfer happen.

The code in models/ and utils/ exist to interface the client of droppr with the various services required to facilitate the WebRTC transfer of files, such as the signal channel or STUN and TURN server.
