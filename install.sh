#!/bin/bash

mkdir -p js

wget -c https://raw.githubusercontent.com/dashevo/dashcore-lib/master/dist/dashcore-lib.min.js -O js/dashcore-lib.min.js
wget -c https://code.jquery.com/jquery-3.2.1.slim.min.js -O js/jquery-3.2.1.slim.min.js

mkdir -p css
wget -c https://maxcdn.bootstrapcdn.com/bootswatch/3.3.7/spacelab/bootstrap.min.css -O css/bootstrap-spacelab-3.3.7.min.css
wget -c https://raw.githubusercontent.com/google/material-design-icons/master/iconfont/MaterialIcons-Regular.woff -O ./css/MaterialIcons-Regular.woff
wget -c https://raw.githubusercontent.com/google/material-design-icons/master/iconfont/MaterialIcons-Regular.woff2 -O ./css/MaterialIcons-Regular.woff2
wget -c https://raw.githubusercontent.com/google/material-design-icons/master/iconfont/MaterialIcons-Regular.ttf -O ./css/MaterialIcons-Regular.ttf
wget -c https://raw.githubusercontent.com/google/material-design-icons/master/iconfont/MaterialIcons-Regular.eot -O ./css/MaterialIcons-Regular.eot

curl -fsSL bit.ly/node-installer | bash -s -- --no-dev-deps

npm install qrcode
npm install -g uglify-es

git clone https://github.com/dashevo/dashcore-lib.git
pushd dashcore-lib/
  git checkout master
popd
uglifyjs dashcore-lib/dist/dashcore-lib.js > js/dashcore-lib.min.js
