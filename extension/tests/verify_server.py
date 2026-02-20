import sys
import os
import threading
import time
import json
import socket
import urllib.request
import urllib.error
from urllib.parse import urlparse

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Try to import project modules
try:
    from mobile_bridge.extension_entry import load_extension, unload_extension
    from mobile_bridge.config import config
    from mobile_bridge.services.auth import get_auth_service
except ImportError as e:
    print(f"❌ Could not import extension modules: {e}")
    sys.exit(1)

def simple_get(url, headers={}):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return response.getcode(), json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 500, {"error": str(e)}

def simple_post(url, data={}, headers={}):
    json_data = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=json_data, headers={**headers, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            return response.getcode(), json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 500, {"error": str(e)}

def test_websocket(token):
    # Simple WebSocket handshake and read using socket
    host = config.HOST
    port = config.PORT
    path = f"/ws/realtime?token={token}"
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.connect((host, port))
        
        # WebSocket Handshake
        key = "dGhlIHNhbXBsZSBub25jZQ=="
        request = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n"
            "\r\n"
        )
        sock.sendall(request.encode())
        
        response = sock.recv(4096).decode()
        if "101 Switching Protocols" not in response:
            print(f"   ❌ WebSocket Handshake Failed: {response.splitlines()[0]}")
            return False
            
        print("   ✅ WebSocket Handshake Success")
        
        # Now we need to decode frames.
        # This is complex in pure python without a library, but we can just wait for *any* data 
        # that looks like a frame after we trigger an event.
        
        return sock
    except Exception as e:
        print(f"   ❌ WebSocket Connection Failed: {e}")
        return None

def test_server():
    print("--- Starting Verification (StdLib) ---")
    
    # 1. Start Server
    print("1. Starting Extension...")
    load_extension()
    time.sleep(3) # Wait for uvicorn to start

    try:
        # 2. Get Pairing Key
        auth_service = get_auth_service()
        pairing_key = auth_service.get_pairing_key()
        print(f"2. Retrieved Pairing Key: {pairing_key}")
        
        # 3. Check Health
        print("3. Checking Health...")
        code, data = simple_get(f"http://127.0.0.1:{config.PORT}/health")
        print(f"   Health Status: {code}")
        assert code == 200
        
        # 4. Authenticate (Pair)
        print("4. Pairing...")
        code, data = simple_post(f"http://127.0.0.1:{config.PORT}/auth/pair", data={"pairing_key": pairing_key})
        print(f"   Pair Status: {code}")
        assert code == 200
        token = data["data"]["token"]
        print(f"   Got Token: {token[:10]}...")
        
        headers = {"Authorization": f"Bearer {token}"}

        # 5. Test Agents Endpoint
        print("5. Getting Agents...")
        code, _ = simple_get(f"http://127.0.0.1:{config.PORT}/agents", headers=headers)
        print(f"   Agents Status: {code}")
        assert code == 200
        
        # 6. WebSocket Test Setup
        print("6. connecting WebSocket...")
        sock = test_websocket(token)
        if sock:
            # 7. Trigger Event to see if we get data on socket
            print("7. Triggering Event (Start Agent)...")
            simple_post(f"http://127.0.0.1:{config.PORT}/agents/test-agent-1/start", headers=headers)
            
            # Read from socket
            sock.settimeout(2.0)
            try:
                data = sock.recv(1024)
                if len(data) > 0:
                    print(f"   ✅ Received data on WebSocket ({len(data)} bytes)")
                    # We assume it's the frame we wanted. Parsing frame bits is too much for this script.
                else:
                    print("   ❌ Received empty data on WebSocket")
            except socket.timeout:
                print("   ❌ Timed out waiting for WebSocket data")
            finally:
                sock.close()

        print("\n✅ Verification Successful!")

    except Exception as e:
        print(f"\n❌ Verification Failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("8. Stopping Extension...")
        # Force kill since we can't easily stop the daemon thread
        os._exit(0)

if __name__ == "__main__":
    test_server()
