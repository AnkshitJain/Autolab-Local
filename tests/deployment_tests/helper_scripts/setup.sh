#!/bin/bash
############
# Purpose: Initial setup for running deployment tests
# Date : 13-March-2018
# Previous Versions: -
# Invocation: $bash init.sh
###########

set -ex
# Increase the rate limit of gitlab, default value is 10
sudo docker exec gitlab sed -i "s/# gitlab_rails\['rate_limit_requests_per_period'] = 10/gitlab_rails\['rate_limit_requests_per_period'] = 1000/" /etc/gitlab/gitlab.rb
sudo docker exec gitlab gitlab-ctl reconfigure
sudo docker exec gitlab gitlab-ctl restart

# install dependencies
npm --quiet install 1>/dev/null 2>&1
sudo apt-get install -y mysql-client
cd ../test_modules
# Initialise the test_modules directory
bash init.sh
