
async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/admin/users', {
      headers: {
        // We can't easily mock next-auth session from outside.
      }
    })
    console.log(res.status, await res.text())
  } catch (err) {
    console.log(err)
  }
}
run()
