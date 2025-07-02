#!/usr/bin/env python3
"""
Magents Claude Bridge Server
Simple Python implementation for reliable Docker agent communication
"""

import json
import os
import socket
import subprocess
import sys
import threading
import signal

SOCKET_PATH = os.environ.get('SOCKET_PATH', '/tmp/claude-bridge-persistent/claude-bridge.sock')

# Clean up old socket
if os.path.exists(SOCKET_PATH):
    os.unlink(SOCKET_PATH)

# Ensure directory exists
os.makedirs(os.path.dirname(SOCKET_PATH), exist_ok=True)

def handle_client(conn, addr):
    """Handle a single agent connection"""
    print(f"New agent connected")
    
    try:
        buffer = b""
        while True:
            data = conn.recv(4096)
            if not data:
                break
                
            buffer += data
            
            # Process complete lines
            while b'\n' in buffer:
                line, buffer = buffer.split(b'\n', 1)
                if not line:
                    continue
                    
                try:
                    request = json.loads(line)
                    print(f"Agent request: claude {' '.join(request.get('args', []))}")
                    
                    if request.get('command') != 'claude':
                        response = {'type': 'error', 'message': 'Only claude commands supported'}
                        conn.send(json.dumps(response).encode() + b'\n')
                        continue
                    
                    # Execute claude command
                    args = ['claude'] + request.get('args', [])
                    env = os.environ.copy()
                    env.update(request.get('env', {}))
                    cwd = request.get('cwd', os.getcwd())
                    
                    try:
                        # Run the command
                        result = subprocess.run(
                            args,
                            capture_output=True,
                            text=True,
                            env=env,
                            cwd=cwd
                        )
                        
                        # Send stdout
                        if result.stdout:
                            conn.send(json.dumps({
                                'type': 'stdout',
                                'data': result.stdout
                            }).encode() + b'\n')
                        
                        # Send stderr
                        if result.stderr:
                            conn.send(json.dumps({
                                'type': 'stderr', 
                                'data': result.stderr
                            }).encode() + b'\n')
                        
                        # Send exit code
                        conn.send(json.dumps({
                            'type': 'exit',
                            'code': result.returncode
                        }).encode() + b'\n')
                        
                    except FileNotFoundError:
                        conn.send(json.dumps({
                            'type': 'error',
                            'message': 'Claude executable not found'
                        }).encode() + b'\n')
                    except Exception as e:
                        conn.send(json.dumps({
                            'type': 'error',
                            'message': str(e)
                        }).encode() + b'\n')
                        
                except json.JSONDecodeError as e:
                    response = {'type': 'error', 'message': f'Invalid JSON: {str(e)}'}
                    conn.send(json.dumps(response).encode() + b'\n')
                    
    except Exception as e:
        print(f"Error handling agent: {e}")
    finally:
        conn.close()
        print("Agent disconnected")

def main():
    print(f"Starting Magents Claude Bridge (Python)")
    print(f"Socket: {SOCKET_PATH}")
    
    # Test claude availability
    try:
        result = subprocess.run(['which', 'claude'], capture_output=True, text=True)
        if result.returncode == 0:
            claude_path = result.stdout.strip()
            print(f"Found claude at: {claude_path}")
            
            # Test execution
            result = subprocess.run(['claude', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"Claude version: {result.stdout.strip()}")
            else:
                print("Warning: Could not get claude version")
        else:
            print("ERROR: claude not found in PATH")
            print("Install with: npm install -g @anthropic-ai/claude-cli")
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: Could not check claude: {e}")
        sys.exit(1)
    
    # Create socket
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.bind(SOCKET_PATH)
    os.chmod(SOCKET_PATH, 0o666)
    sock.listen(5)
    
    print(f"Bridge ready for agents on {SOCKET_PATH}")
    print(f"PID: {os.getpid()}")
    
    # Write PID file
    with open(os.path.join(os.path.dirname(SOCKET_PATH), 'bridge.pid'), 'w') as f:
        f.write(str(os.getpid()))
    
    # Handle shutdown
    def shutdown(signum, frame):
        print("\nShutting down bridge...")
        sock.close()
        if os.path.exists(SOCKET_PATH):
            os.unlink(SOCKET_PATH)
        sys.exit(0)
    
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    
    # Accept connections
    while True:
        try:
            conn, addr = sock.accept()
            thread = threading.Thread(target=handle_client, args=(conn, addr))
            thread.daemon = True
            thread.start()
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error accepting connection: {e}")

if __name__ == '__main__':
    main()