from setuptools import setup, find_packages

setup(
    name="mobile_bridge",
    version="0.1.0",
    description="Antigravity extension for mobile remote control",
    author="Antigravity User",
    packages=find_packages(),
    install_requires=[
        "fastapi==0.109.0",
        "uvicorn==0.27.0",
        "pyjwt==2.8.0",
        "pydantic==2.6.0",
        "websockets==12.0",
        "google-generativeai"
    ],
    entry_points={
        "antigravity.extensions": [
            "mobile_bridge = mobile_bridge.extension_entry:MobileBridgeExtension"
        ]
    }
)
