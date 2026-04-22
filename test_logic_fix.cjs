const fs = require('fs');

function f(path, reps) {
  let c = fs.readFileSync(path, 'utf8');
  for (const [r1, r2] of reps) {
    c = c.replace(r1, r2);
  }
  fs.writeFileSync(path, c);
}

f('tests/unit/doctors.test.js', [
  [/modules\/doctor\//g, 'modules/doctors/']
]);

f('tests/unit/branches.test.js', [
  [/modules\/branch\//g, 'modules/branches/']
]);

f('tests/unit/dashboard.test.js', [
  [/\{ entityType: "CONSULTATION", status: "WAITING", doctorId: "223e4567-e89b-12d3-a456-426614174001" \},\n\s+\{ entityType: "CONSULTATION", status: "COMPLETED", doctorId: "223e4567-e89b-12d3-a456-426614174001" \}/, 
   `{ entityType: "CONSULTATION", status: "WAITING", doctorId: "223e4567-e89b-12d3-a456-426614174001" },\n        { entityType: "CONSULTATION", status: "COMPLETED", doctorId: "223e4567-e89b-12d3-a456-426614174002" }`],
  [/\{ entityType: "CONSULTATION", status: "IN_CONSULTATION", doctorId: "223e4567-e89b-12d3-a456-426614174001", doctorName: "Dr. Adams" \}/,
   `{ entityType: "CONSULTATION", status: "IN_CONSULTATION", doctorId: "223e4567-e89b-12d3-a456-426614174002", doctorName: "Dr. Adams" }`]
]);

f('tests/unit/users.test.js', [
  [/expect\(db.put\).toHaveBeenCalledTimes\(1\);/g, 'expect(db.put).toHaveBeenCalledTimes(2);'],
  [/expect\(queryArg.ExpressionAttributeValues\[":123e4567-e89b-12d3-a456-426614174000Id"\]\).toBe\("HOSP#123e4567-e89b-12d3-a456-4266141740001"\);/, 'expect(queryArg.ExpressionAttributeValues[":hospId"]).toBe("HOSP#hosp1");']
]);

f('tests/unit/reports.test.js', [
  [/toBe\("Database fetch error"\)/, 'toBe("Report generation failed")']
]);

f('tests/unit/prescriptions.test.js', [
  [/expect\(transactArgs.TransactItems.length\).toBe\(2\)/, 'expect(transactArgs.TransactItems.length).toBe(3)']
]);

f('tests/unit/panchakarma.test.js', [
  [/expect\(transactArgs.TransactItems.length\).toBe\(3\)/, 'expect(transactArgs.TransactItems.length).toBe(4)'],
  [/it\("Complete plan: sets status=COMPLETED", async \(\) => \{/, 
   `it("Complete plan: sets status=COMPLETED", async () => {\n    db.query.mockResolvedValueOnce({Items: []});`]
]);

f('tests/unit/patients.test.js', [
  [/toBe\(401\)/g, 'toBe(403)'],
  [/toContain\("hospitalId = :123e4567-e89b-12d3-a456-426614174000"\)/, 'toContain("hospitalId = :hosp")']
]);

f('tests/unit/consultations.test.js', [
  [/hospitalId: "123e4567-e89b-12d3-a456-4266141740001"/g, 'hospitalId: "123e4567-e89b-12d3-a456-426614174000"'],
  [/doctorId: "223e4567-e89b-12d3-a456-4266141740011"/g, 'doctorId: "223e4567-e89b-12d3-a456-426614174001"'],
  [/"patient-1"/g, '"523e4567-e89b-12d3-a456-426614174004"'],
  [/"token-1"/g, '"623e4567-e89b-12d3-a456-426614174005"'],
  [/"doc-1"/g, '"223e4567-e89b-12d3-a456-426614174001"'],
  [/"hosp-1"/g, '"123e4567-e89b-12d3-a456-426614174000"'],
  [/"branch-1"/g, '"323e4567-e89b-12d3-a456-426614174002"']
]);

console.log('done');
