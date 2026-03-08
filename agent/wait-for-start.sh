#!/bin/bash

set -euo pipefail

while read -r line; do
  echo "$line"
  if [ "$line" == "Started" ]; then
    break
  fi
done
