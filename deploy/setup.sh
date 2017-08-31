#!/bin/bash

sudo true

#install docker dependecy for AUFS file system
sudo apt-get install -y lxc wget bsdtar curl
sudo apt-get install -y "linux-image-extra-$(uname -r)"
sudo modprobe aufs
wget -qO- https://get.docker.com/ | sh

sudo apt update
sudo apt install -y python-pip libssl-dev sshpass libffi-dev build-essential python-dev
sudo pip install --upgrade pip
sudo pip install cryptography
sudo pip install setuptools
sudo pip install ansible
sudo apt-get install npm
cd ../main_server
npm install
cd ../load_balancer
npm install
cd ../execution_nodes
npm install
cd ../deploy
sudo service docker restart

echo "Creating SSL certificates"
bash keys.sh

cat << EOF
Done installing base packages

You may now edit the configuration files in configs directory and execute
'sudo ansible-playbook -i inventory playbook.yml -u <username> --ask-sudo-pass'
to install AutoLabJS
EOF
