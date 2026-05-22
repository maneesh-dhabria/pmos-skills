import click

@click.command()
def hello():
    print("hi")

def _internal():
    print("debug")
