def handle_request(req):
    db.execute("SELECT * FROM users")
    return req
