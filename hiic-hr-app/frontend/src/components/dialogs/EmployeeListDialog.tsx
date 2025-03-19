import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface Employee {
  id: string;
  name: string;
  性别: string;
  age: number;
  department: string;
  position: string;
}

interface EmployeeListDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  employees: Employee[];
  loading: boolean;
  error: string | null;
}

const EmployeeListDialog: React.FC<EmployeeListDialogProps> = ({ 
  open, 
  onClose, 
  title, 
  employees, 
  loading, 
  error 
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" align="center">
            {error}
          </Typography>
        ) : employees && employees.length > 0 ? (
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="员工列表">
              <TableHead>
                <TableRow>
                  <TableCell>姓名</TableCell>
                  <TableCell>性别</TableCell>
                  <TableCell>年龄</TableCell>
                  <TableCell>部门</TableCell>
                  <TableCell>职位</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow
                    key={employee.id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {employee.name}
                    </TableCell>
                    <TableCell>{employee.性别}</TableCell>
                    <TableCell>{employee.age}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography align="center">没有找到符合条件的员工</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeListDialog; 