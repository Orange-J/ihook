const commonExecutor = require('..');

test('return 0 if the task command executed successfully', () => {
    let result = commonExecutor({
        command: 'ls',
        cwd: __dirname
    });
    expect(result).toBe(0);
});

test('return non-zero value if a non-zero exit character is assigned to exit command', () => {
    let result = commonExecutor({
        command: 'exit 8',
        cwd: __dirname
    });
    expect(result).not.toBe(0);
});

test('return non-zero value if the task command is empty', () => {
    let result = commonExecutor();
    expect(result).not.toBe(0);
});

test('return non-zero value if the task command is invalid shell code', () => {
    let result = commonExecutor({
        command: 'nosuchcommand',
        cwd: __dirname
    });
    expect(result).not.toBe(0);
});
