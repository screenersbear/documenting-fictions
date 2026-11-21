#!/bin/bash
cd "/Users/starkyproductions/Library/CloudStorage/GoogleDrive-starky@starkymorillo.com/My Drive/Claude/Documenting Fictions"
git add .
echo "What did you change?"
read message
git commit -m "$message"
git push
