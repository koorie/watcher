echo 'console.log("hello world!!!")' >> tests/map.js &&
echo 'console.log("hello world!!!")' >> tests/map.js &&
mv tests/map.js tests/moved/map.js &&
mv tests/moved/map.js tests/map.js &&
touch tests/set.js tests/settings.js &&
echo 'console.log("hello world!!!")' >> tests/set.js &&
echo 'console.log("hello world!!!")' >> tests/settings.js &&
rm tests/set.js tests/settings.js tests/map.js
echo 'console.log("hello world!!!")' >> tests/main.js &&
echo 'console.log("hello world!!!")' >> tests/main.js
rm tests/main.js
