import React, { useState, useMemo } from 'react';
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
  Box,
  Typography,
  CircularProgress,
  useTheme,
  useMediaQuery,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';

const EmployeeListDialog = ({ open, onClose, title, employees, loading, error }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  // 筛选状态
  const [filters, setFilters] = useState({
    name: '',
    gender: '',
    age: '',
    department: '',
    position: ''
  });
  
  // 从员工数据中提取唯一的选项
  const filterOptions = useMemo(() => {
    if (!employees || employees.length === 0) return {
      genders: [],
      departments: [],
      positions: []
    };
    
    return {
      genders: [...new Set(employees.map(emp => emp.gender))],
      departments: [...new Set(employees.map(emp => emp.department))],
      positions: [...new Set(employees.map(emp => emp.position))]
    };
  }, [employees]);
  
  // 处理筛选变化
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // 清除特定筛选
  const handleClearFilter = (field) => {
    setFilters(prev => ({
      ...prev,
      [field]: ''
    }));
  };
  
  // 清除所有筛选
  const handleClearAllFilters = () => {
    setFilters({
      name: '',
      gender: '',
      age: '',
      department: '',
      position: ''
    });
  };
  
  // 筛选后的员工列表
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    
    return employees.filter(employee => {
      // 姓名筛选 (模糊匹配)
      if (filters.name && !employee.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
      
      // 性别筛选 (精确匹配)
      if (filters.gender && employee.gender !== filters.gender) {
        return false;
      }
      
      // 年龄筛选 (可以是范围或精确值)
      if (filters.age) {
        const age = Number(employee.age);
        const filterAge = filters.age.toString();
        
        if (filterAge.includes('-')) {
          // 范围筛选 (例如: "20-30")
          const [min, max] = filterAge.split('-').map(Number);
          if (age < min || age > max) return false;
        } else if (!isNaN(Number(filterAge))) {
          // 精确匹配
          if (age !== Number(filterAge)) return false;
        }
      }
      
      // 部门筛选 (精确匹配)
      if (filters.department && employee.department !== filters.department) {
        return false;
      }
      
      // 职位筛选 (精确匹配)
      if (filters.position && employee.position !== filters.position) {
        return false;
      }
      
      return true;
    });
  }, [employees, filters]);
  
  // 活跃筛选器数量
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          bgcolor: 'rgba(22, 28, 36, 0.95)',
          backgroundImage: 'none',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          color: '#fff',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'rgba(30, 38, 50, 0.95)', 
        color: '#fff',
        py: 2,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              color: '#fff',
              bgcolor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, p: 3 }}>
            <CircularProgress sx={{ color: '#4dabf5' }} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error" align="center" sx={{ mb: 2 }}>
              {error}
            </Typography>
          </Box>
        ) : employees && employees.length > 0 ? (
          <>
            {/* 筛选器区域 */}
            <Box sx={{ 
              p: 2, 
              bgcolor: 'rgba(30, 38, 50, 0.7)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FilterListIcon sx={{ mr: 1, color: '#4dabf5' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    筛选条件
                  </Typography>
                </Box>
                {activeFiltersCount > 0 && (
                  <Chip 
                    label={`清除所有筛选 (${activeFiltersCount})`} 
                    onClick={handleClearAllFilters}
                    sx={{ 
                      bgcolor: 'rgba(77, 171, 245, 0.2)', 
                      color: '#4dabf5',
                      '&:hover': { bgcolor: 'rgba(77, 171, 245, 0.3)' }
                    }}
                  />
                )}
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {/* 姓名筛选 */}
                <TextField
                  label="姓名"
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                  variant="outlined"
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#bbb' }} />
                      </InputAdornment>
                    ),
                    endAdornment: filters.name ? (
                      <InputAdornment position="end">
                        <IconButton 
                          size="small" 
                          onClick={() => handleClearFilter('name')}
                          sx={{ color: '#bbb' }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                    sx: { 
                      color: '#fff',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#4dabf5',
                      }
                    }
                  }}
                  InputLabelProps={{
                    sx: { color: '#bbb' }
                  }}
                  sx={{ minWidth: 150 }}
                />
                
                {/* 性别筛选 */}
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="gender-filter-label" sx={{ color: '#bbb' }}>性别</InputLabel>
                  <Select
                    labelId="gender-filter-label"
                    value={filters.gender}
                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                    label="性别"
                    sx={{ 
                      color: '#fff',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#4dabf5',
                      }
                    }}
                    endAdornment={filters.gender ? (
                      <IconButton 
                        size="small" 
                        onClick={() => handleClearFilter('gender')}
                        sx={{ color: '#bbb', mr: 2 }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  >
                    <MenuItem value="">全部</MenuItem>
                    {filterOptions.genders.map(gender => (
                      <MenuItem key={gender} value={gender}>{gender}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {/* 年龄筛选 */}
                <TextField
                  label="年龄"
                  value={filters.age}
                  onChange={(e) => handleFilterChange('age', e.target.value)}
                  placeholder="例如: 25 或 20-30"
                  variant="outlined"
                  size="small"
                  InputProps={{
                    endAdornment: filters.age ? (
                      <InputAdornment position="end">
                        <IconButton 
                          size="small" 
                          onClick={() => handleClearFilter('age')}
                          sx={{ color: '#bbb' }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                    sx: { 
                      color: '#fff',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#4dabf5',
                      }
                    }
                  }}
                  InputLabelProps={{
                    sx: { color: '#bbb' }
                  }}
                  sx={{ minWidth: 150 }}
                />
                
                {/* 部门筛选 */}
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="department-filter-label" sx={{ color: '#bbb' }}>部门</InputLabel>
                  <Select
                    labelId="department-filter-label"
                    value={filters.department}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                    label="部门"
                    sx={{ 
                      color: '#fff',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#4dabf5',
                      }
                    }}
                    endAdornment={filters.department ? (
                      <IconButton 
                        size="small" 
                        onClick={() => handleClearFilter('department')}
                        sx={{ color: '#bbb', mr: 2 }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  >
                    <MenuItem value="">全部</MenuItem>
                    {filterOptions.departments.map(dept => (
                      <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {/* 职位筛选 */}
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel id="position-filter-label" sx={{ color: '#bbb' }}>职位</InputLabel>
                  <Select
                    labelId="position-filter-label"
                    value={filters.position}
                    onChange={(e) => handleFilterChange('position', e.target.value)}
                    label="职位"
                    sx={{ 
                      color: '#fff',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#4dabf5',
                      }
                    }}
                    endAdornment={filters.position ? (
                      <IconButton 
                        size="small" 
                        onClick={() => handleClearFilter('position')}
                        sx={{ color: '#bbb', mr: 2 }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  >
                    <MenuItem value="">全部</MenuItem>
                    {filterOptions.positions.map(position => (
                      <MenuItem key={position} value={position}>{position}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              {/* 筛选结果统计 */}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#bbb' }}>
                  {filteredEmployees.length} 位员工 {activeFiltersCount > 0 ? `(已筛选，共${employees.length}位)` : ''}
                </Typography>
              </Box>
            </Box>
            
            {/* 表格区域 */}
            <TableContainer component={Box} sx={{ maxHeight: '60vh' }}>
              <Table stickyHeader sx={{ minWidth: 650 }} aria-label="员工列表">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ 
                      bgcolor: 'rgba(30, 38, 50, 0.95)', 
                      color: '#fff',
                      fontWeight: 600,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>姓名</TableCell>
                    <TableCell sx={{ 
                      bgcolor: 'rgba(30, 38, 50, 0.95)', 
                      color: '#fff',
                      fontWeight: 600,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>性别</TableCell>
                    <TableCell sx={{ 
                      bgcolor: 'rgba(30, 38, 50, 0.95)', 
                      color: '#fff',
                      fontWeight: 600,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>年龄</TableCell>
                    <TableCell sx={{ 
                      bgcolor: 'rgba(30, 38, 50, 0.95)', 
                      color: '#fff',
                      fontWeight: 600,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>部门</TableCell>
                    <TableCell sx={{ 
                      bgcolor: 'rgba(30, 38, 50, 0.95)', 
                      color: '#fff',
                      fontWeight: 600,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>职位</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((employee) => (
                      <TableRow
                        key={employee.id}
                        sx={{ 
                          '&:nth-of-type(odd)': { bgcolor: 'rgba(30, 38, 50, 0.4)' },
                          '&:nth-of-type(even)': { bgcolor: 'rgba(30, 38, 50, 0.2)' },
                          '&:hover': { bgcolor: 'rgba(65, 105, 225, 0.15)' },
                          transition: 'background-color 0.2s',
                          borderBottom: 'none'
                        }}
                      >
                        <TableCell 
                          component="th" 
                          scope="row"
                          sx={{ 
                            color: '#fff', 
                            borderBottom: 'none',
                            fontWeight: 500
                          }}
                        >
                          {employee.name}
                        </TableCell>
                        <TableCell sx={{ color: '#bbb', borderBottom: 'none' }}>{employee.gender}</TableCell>
                        <TableCell sx={{ color: '#bbb', borderBottom: 'none' }}>{employee.age}</TableCell>
                        <TableCell sx={{ color: '#bbb', borderBottom: 'none' }}>{employee.department}</TableCell>
                        <TableCell sx={{ color: '#bbb', borderBottom: 'none' }}>{employee.position}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', color: '#bbb', py: 4, borderBottom: 'none' }}>
                        没有找到符合筛选条件的员工
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography align="center" sx={{ color: '#bbb' }}>
              没有找到符合条件的员工
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeListDialog; 