#!/bin/bash
# Don't fail the build if CocoaPods setup has issues
set +e

echo "Setting up CocoaPods repository..."

# Create CocoaPods repos directory if it doesn't exist
mkdir -p ~/.cocoapods/repos 2>/dev/null || true

# Check if trunk repo exists, if not add it
if [ ! -d "$HOME/.cocoapods/repos/trunk" ]; then
  echo "Adding CocoaPods trunk repository..."
  # Try using pod repo add first
  pod repo add trunk https://github.com/CocoaPods/Specs.git 2>&1 || {
    echo "Warning: pod repo add failed, trying alternative method..."
    # Alternative: clone the repo directly if pod command fails
    if command -v git &> /dev/null; then
      cd ~/.cocoapods/repos 2>/dev/null || mkdir -p ~/.cocoapods/repos && cd ~/.cocoapods/repos
      git clone --depth 1 https://github.com/CocoaPods/Specs.git trunk 2>&1 || {
        echo "Warning: Git clone also failed, continuing anyway..."
      }
    fi
  }
fi

# Update CocoaPods repo if it exists
if [ -d "$HOME/.cocoapods/repos/trunk" ]; then
  echo "CocoaPods repository found, setup complete."
else
  echo "Warning: CocoaPods repository not found, but continuing build..."
fi

echo "CocoaPods repository setup complete."

