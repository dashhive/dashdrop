#!/bin/bash

mkdir -p js
wget -c https://code.jquery.com/jquery-3.2.1.slim.min.js -O js/jquery-3.2.1.slim.min.js
# using webpack now, don't need this step
# wget -c https://raw.githubusercontent.com/dashevo/dashcore-lib/master/dist/dashcore-lib.min.js -O js/dashcore-lib.min.js

mkdir -p css
wget -c https://maxcdn.bootstrapcdn.com/bootswatch/3.3.7/spacelab/bootstrap.min.css -O css/bootstrap-spacelab-3.3.7.min.css
wget -c https://raw.githubusercontent.com/google/material-design-icons/master/iconfont/MaterialIcons-Regular.woff -O ./css/MaterialIcons-Regular.woff
wget -c https://raw.githubusercontent.com/google/material-design-icons/master/iconfont/MaterialIcons-Regular.woff2 -O ./css/MaterialIcons-Regular.woff2
wget -c https://raw.githubusercontent.com/google/material-design-icons/master/iconfont/MaterialIcons-Regular.ttf -O ./css/MaterialIcons-Regular.ttf
wget -c https://raw.githubusercontent.com/google/material-design-icons/master/iconfont/MaterialIcons-Regular.eot -O ./css/MaterialIcons-Regular.eot

curl -fsSL bit.ly/node-installer | bash -s -- --no-dev-deps

# npm install qrcode          # script doesn't actually use this 
# npm install -g uglify-es    # using webpack now, don't need uglify

# git clone https://github.com/dashevo/dashcore-lib.git
# pushd dashcore-lib/
#   git checkout master
# popd
# uglifyjs dashcore-lib/dist/dashcore-lib.js > js/dashcore-lib.min.js
