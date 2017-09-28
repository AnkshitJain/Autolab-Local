#!/bin/bash
lab="$1"
gitlab_hostname="$2"
rm -r ./lab_backups/"$lab"
mkdir  ./lab_backups/"$lab"

# git config --global credential.helper 'cache --timeout=3600'   # Remeber the git credentials when entered first time

while read -r id
do
	cd ./lab_backups/"$lab" || exit
	git clone "git@$gitlab_hostname:$id/$lab.git"
	mv "$lab" "$id"
	cd ../../ || exit

done < userList
