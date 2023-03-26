class RecordType {
    static __$record_CLASS_TYPE = Symbol("Class type");
    static __$record_PRIMITIVE_TYPES = ["number", "string", "boolean"];
    __$record_MEMBERS = [];

    constructor(members = [], name = null) {
        this.__$record_MEMBERS = members;
        this.__$record_TYPE_NAME = name;
    }

    toJSON() {
        const obj = {};
        for (let prop of this.__$record_MEMBERS) {
            obj[prop.name] = this[prop.name];
        }
        return JSON.stringify(obj);
    }

    toString() {
        const stringComponents = [];
        stringComponents.push(`${this.__$record_TYPE_NAME ?? "Record"} {`)
        for (let i = 0; i < this.__$record_MEMBERS.length; i++) {
            stringComponents.push(`  ${this.__$record_MEMBERS[i].name}: ${this[this.__$record_MEMBERS[i].name]}`);
        }
        stringComponents.push("}");
        return stringComponents.join("\n");
    }

    structuralEquals(other) {
        // Same object reference? If so, then they are necessarily equals
        if (this === other) {
            return true;
        }

        // Assert that all properties have strictly equals values
        for (let i = 0; i < this.__$record_MEMBERS.length; i++) {
            const propName = this.__$record_MEMBERS[i].name;
            if (this[propName] !== other[propName]) return false;
        }

        return true;
    }

    equals(other) {
        // Same object reference? If so, then they are necessarily equals
        if (this === other) {
            return true;
        }

        // Assert same constructor. If not, they cannot be equal
        if (!(other instanceof this.constructor)) {
            return false;
        }

        // Assert that all properties have strictly equals values
        for (let i = 0; i < this.__$record_MEMBERS.length; i++) {
            const propName = this.__$record_MEMBERS[i].name;
            if (this[propName] !== other[propName]) return false;
        }

        return true;
    }

    static typeCheck(value, type, optional = false) {
        if (!type) return true; // falsy type is implicitly like a TypeScript 'any'

        if (optional && (value === undefined || value === null)) return true;

        if (RecordType.__$record_PRIMITIVE_TYPES.includes(type))
            return typeof value === type;

        if (type === "array")
            return Array.isArray(value);

        return value instanceof type;
    }
}

const Record = (definition, name = null) => {
    let order = 0;
    const members = {};
    const membersOrder = [];
    const selfConstructor = Symbol("Self constructor type");
    let thisDefinitionProxy = null;

    const typeDefinerFor = (name) => {
        let thisTypeProxy = null;
        const proxy = new Proxy({}, {
            get: function (target, property) {
                if (property === "class") {
                    return function (klass) {
                        members[name].type = RecordType.__$record_CLASS_TYPE;
                        if (klass === thisDefinitionProxy) {
                            members[name].constructor = selfConstructor
                            // 'self type' values MUST be nullable
                            members[name].nullable = true;
                        } else {
                            members[name].constructor = klass;
                        }
                        return thisTypeProxy;
                    }
                }
                else if (property === "optional") {
                    members[name].nullable = true;
                } else {
                    members[name].type = property;
                }
                return thisTypeProxy;
            }
        });

        thisTypeProxy = proxy;
        return proxy;
    };

    const memberDefiner = new Proxy({}, {
        get: function (_, property) {
            const definition = { name: property, type: undefined };
            members[property] = definition;
            membersOrder.push(definition);
            return typeDefinerFor(property);
        }
    })

    thisDefinitionProxy = memberDefiner;
    definition(memberDefiner);

    return class extends RecordType {
        static definition = members;
        static __$record_MEMBERS = membersOrder;

        constructor(...args) {
            super(membersOrder, name);
            for (let member of membersOrder) {
                if (member.type === RecordType.__$record_CLASS_TYPE && member.constructor === selfConstructor) {
                    member.constructor = this.constructor;
                }
            }
            for (let i = 0; i < args.length; i++) {
                const member = membersOrder[i];
                const expectedType = member.type === RecordType.__$record_CLASS_TYPE ? member.constructor : member.type;
                if (!RecordType.typeCheck(args[i], expectedType, member.nullable ?? false)) {
                    throw new Error(`Argument ${i} (${args[i]}) is not of the expected type: ${typeof expectedType === "function" ? expectedType.name : expectedType}`);
                }
                this[membersOrder[i].name] = args[i];
            }

            const proxy = new Proxy(this, {
                set: function (instance, property, value) {
                    const member = instance.__$record_MEMBERS.find(m => m.name === property);
                    const expectedType = member.type === RecordType.__$record_CLASS_TYPE ? member.constructor : member.type;

                    if (!member) {
                        throw new Error(`This record type does not define a property named "${property}"`);
                    }

                    if (!RecordType.typeCheck(value, expectedType, member.nullable ?? false)) {
                        throw new Error(`Value (${value}) is not of the expected type: ${typeof expectedType === "function" ? expectedType.name : expectedType}`);
                    }

                    instance[property] = value;
                    return true;
                }
            });

            return proxy;
        }

        static fromJSON(json) {
            const obj = JSON.parse(json);
            let args = [];
            for (let member of this.__$record_MEMBERS) {
                console.log("MEMBER", member);
                if (member.type === RecordType.__$record_CLASS_TYPE && Object.getPrototypeOf(member.constructor) === RecordType) {
                    console.log("FROM JSONING MEMBER", member.name);
                    args.push(member.constructor.fromJSON(obj[member.name]));
                } else {
                    args.push(obj[member.name]);
                }
            }
            return new this(...args);
        }
    }
}