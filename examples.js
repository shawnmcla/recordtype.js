const Employee = Record(r => { r.name.string, r.id.number, r.supervisor.class(r) });
const bigBoss = new Employee("Joe Schmoe", 100);
const pleb = new Employee("Jimmy Johnson", 200, bigBoss);

console.log(bigBoss.toJSON());
console.log(pleb.toJSON());
console.log(pleb.equals(pleb));
console.log(pleb.euqlas(bigBoss));

console.log(Employee.fromJSON(pleb.toJSON()));

