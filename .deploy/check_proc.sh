#!/bin/bash
ps -ef | grep -iE 'tsx|enrich-tmdb|node|search:sync' | grep -v grep | head -10
echo "---"
echo "Latest enrich log:"
tail -8 /tmp/enrich-tmdb.log 2>&1
