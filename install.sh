#!/bin/bash

mkdir -p js
#wget https://github.com/dashevo/bitcore-lib-dash/raw/master/bitcore-lib-dash.min.js -O js/bitcore-lib-dash.min.js
wget -c https://github.com/dashevo/bitcore-lib-dash/raw/master/bitcore-lib-dash.js -O js/bitcore-lib-dash.js
uglifyjs js/bitcore-lib-dash.js > js/bitcore-lib-dash.min.js
wget -c https://code.jquery.com/jquery-3.2.1.slim.min.js -O js/jquery-3.2.1.slim.min.js

mkdir -p css
wget -c https://maxcdn.bootstrapcdn.com/bootswatch/3.3.7/spacelab/bootstrap.min.css -O css/bootstrap-spacelab-3.3.7.min.css
