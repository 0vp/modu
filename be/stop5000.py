#!/usr/bin/env python3
import subprocess
import sys

def kill_port_5000():
    try:
        result = subprocess.run(['lsof', '-ti:5000'], capture_output=True, text=True)
        
        if result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            
            for pid in pids:
                if pid:
                    print(f"Killing process {pid} on port 5000...")
                    subprocess.run(['kill', '-9', pid])
            
            print("Port 5000 cleared successfully!")
        else:
            print("No process found on port 5000")
            
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    kill_port_5000()