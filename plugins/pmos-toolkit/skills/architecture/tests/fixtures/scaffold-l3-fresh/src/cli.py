import typer

app = typer.Typer()

@app.command()
def hello():
    print("hi")
