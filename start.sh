#! /bin/sh

if [ ! -d "config" ]; then
    echo "Creating config dir"
    mkdir config
fi

if [ ! -f "config/default.json" ]; then
    if [ ! -f "sample_config/default.json" ]; then
        echo "No default config found, exiting"
        exit 1
    fi
    echo "Copying default config"
    cp sample_config/default.json config
fi

echo "Starting node"
node server.js -u www:data
