COLOURS = {"black", "white", "blue", "brown", "gray", "orange", "red", "yellow"}

SURFACE = {
    "patches": "patches of colour",
    "spots": "spots",
    "stripes": "stripes",
    "furry": "fur",
    "hairless": "bare skin with little or no hair",
    "toughskin": "tough or thick skin",
}

BODY_PARTS = {
    "flippers": "flippers",
    "hands": "hands",
    "hooves": "hooves",
    "pads": "paw pads",
    "paws": "paws",
    "longleg": "long legs",
    "longneck": "a long neck",
    "tail": "a tail",
    "chewteeth": "teeth suited to chewing",
    "meatteeth": "teeth suited to eating meat",
    "buckteeth": "prominent front teeth",
    "strainteeth": "teeth or baleen suited to straining food from water",
    "horns": "horns",
    "claws": "claws",
    "tusks": "tusks",
    "muscle": "a visibly muscular build",
}

SIZE_SHAPE = {
    "big": "large",
    "small": "small",
    "bulbous": "round or bulbous in shape",
    "lean": "lean in build",
    "strong": "strong",
    "weak": "weak",
    "fast": "fast",
    "slow": "slow",
    "smelly": "notably smelly",
    "fierce": "fierce",
    "timid": "timid",
    "smart": "unusually intelligent",
    "active": "active",
    "inactive": "inactive for most of the day",
    "agility": "agile",
    "domestic": "commonly kept as a domestic or farm animal",
}

BEHAVIOUR = {
    "flys": "fly",
    "hops": "move by hopping",
    "swims": "swim",
    "tunnels": "dig tunnels",
    "walks": "walk on land",
    "bipedal": "usually move on two legs",
    "quadrapedal": "usually move on four legs",
    "nocturnal": "are active mainly at night",
    "hibernate": "hibernate",
    "forager": "forage for food",
    "grazer": "graze",
    "hunter": "hunt other animals",
    "scavenger": "scavenge",
    "skimmer": "skim food from the surface of water",
    "stalker": "stalk their prey",
    "group": "live in groups",
    "solitary": "live alone",
    "nestspot": "make a nest or den",
}

DIET = {
    "fish": "fish",
    "meat": "meat",
    "plankton": "plankton",
    "vegetation": "plants",
    "insects": "insects",
}

HABITAT = {
    "arctic": "the arctic",
    "coastal": "coastal areas",
    "desert": "the desert",
    "bush": "bushland",
    "plains": "open plains",
    "forest": "forests",
    "fields": "fields",
    "jungle": "the jungle",
    "mountains": "mountains",
    "ocean": "the ocean",
    "ground": "on the ground",
    "water": "in water",
    "tree": "in trees",
    "cave": "in caves",
}

REGION = {
    "newworld": "native to the Americas",
    "oldworld": "native to Africa, Europe, Asia or Australia",
}


def question_for(attribute: str) -> str:
    if attribute in COLOURS:
        return f"Is it usually {attribute} in colour?"
    if attribute in SURFACE:
        return f"Does it have {SURFACE[attribute]}?"
    if attribute in BODY_PARTS:
        return f"Does it have {BODY_PARTS[attribute]}?"
    if attribute in SIZE_SHAPE:
        return f"Is it {SIZE_SHAPE[attribute]}?"
    if attribute in BEHAVIOUR:
        return f"Does it {BEHAVIOUR[attribute]}?"
    if attribute in DIET:
        return f"Does it eat {DIET[attribute]}?"
    if attribute in HABITAT:
        article = "" if attribute in {"ground", "water", "tree", "cave"} else "in "
        return f"Does it live {article}{HABITAT[attribute]}?"
    if attribute in REGION:
        return f"Is it {REGION[attribute]}?"
    raise KeyError(attribute)


def statement_for(attribute: str, name: str) -> str:
    question = question_for(attribute)
    return question.replace("Is it", f"Is a {name}", 1).replace("Does it", f"Does a {name}", 1)
