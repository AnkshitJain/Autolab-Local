#!/bin/bash
#########################
# Purpose: install the necessary node dependencies for the specified usage
# Authors: Ankshit Jain
# Invocation: $bash npm_install.sh
# Date: 21-March-2018
# Previous Versions: -
#########################
# All local variables are in lower case convention. They are:
#  usage : decides which components need npm packages installed.
#          Valid values are: "production", "development", "test"
#          "production" will install npm packages for components in productionComponents
#          "development" will install npm packages for components in both
#             productionComponents and testComponents
#          "test" will install npm packages for components in testComponents
#  base_directory: path of the base directory where we need npm packages to be installed
#  productionComponents : array containing npm packages installation paths for
#                         production components
#  testComponents       : array containing npm packages installation paths for
#                         test components
# Note: pwd is the home directory of AutolabJS directory

usage=$1
base_directory=$2
productionComponents=( "main_server" "main_server/public/js" "load_balancer" "execution_nodes" "util" )
testComponents=( "tests/deployment_tests" "tests/functional_tests" "tests/test_modules" )
componentPaths=()

if [ ! $base_directory ]
then
  echo -e "Please specify the base directory. Exiting."
  exit 1
fi

if [ "$usage" == "production" ]
then
    componentPaths=( ${productionComponents[@]} )
elif [ "$usage" == "testing" ]
then
    componentPaths=( ${productionComponents[@]} )
elif [ "$usage" == "development" ]
then
      componentPaths=( ${productionComponents[@]} ${testComponents[@]} )
fi

for i in "${componentPaths[@]}"
do
  npm install --silent --prefix "$base_directory/$i" 1>/dev/null 2>&1
done
